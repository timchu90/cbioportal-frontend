import _ from "lodash";
import {nelderMead} from 'fmin';
import {getDeterministicRandomNumber} from "../../../shared/components/plots/PlotUtils";

type Area = {size:number, sets:string[], preciseSize: number};
type SetRectangles = {[setId:string]:Rectangle};
type Rectangle = {x:number, y:number, xLength:number, yLength:number};// bottom-left aligned
const VennJs = require("venn.js");

function getMargin(x:number, y:number, setRectangles:SetRectangles) {
    let margin = Number.POSITIVE_INFINITY;
    for (const rect of _.values(setRectangles)) {
        const marginFromLeft = Math.abs(x - rect.x);
        const marginFromRight = Math.abs(x - (rect.x + rect.xLength));
        const marginFromBottom = Math.abs(y - rect.y);
        const marginFromTop = Math.abs(y - (rect.y + rect.yLength));

        margin = Math.min(margin, marginFromLeft, marginFromRight, marginFromBottom, marginFromTop);
    }
    return margin;
}

export function getRegionLabelPosition(sets:string[], setRectangles:SetRectangles) {
    // only sample within intersection region
    const sampleRect = rectangleIntersection(...sets.map(s=>setRectangles[s]));
    const xMin = sampleRect.x;
    const xMax = sampleRect.x + sampleRect.xLength;
    const yMin = sampleRect.y;
    const yMax = sampleRect.y + sampleRect.yLength;

    // First sample to find an initial position thats inside the region
    const excludedSets = _.difference(Object.keys(setRectangles), sets);
    let initialPosition = null;
    let numSamples = 100;
    let bestMargin = 0;
    let randomNumber = getDeterministicRandomNumber(100);
    for (let i=0; i<numSamples; i++) {
        randomNumber = getDeterministicRandomNumber(randomNumber);
        const x = randomNumber*(xMax-xMin) + xMin;
        randomNumber = getDeterministicRandomNumber(randomNumber);
        const y = randomNumber*(yMax-yMin) + yMin;
        // we already know point is inside intersected sets, so lets just make sure its not in excluded sets
        let inside = true;
        for (const set of excludedSets) {
            inside = inside && !isPointInsideRectangle(x, y, setRectangles[set]);
        }
        if (inside) {
            const newMargin = getMargin(x, y, setRectangles);
            if (newMargin > bestMargin) {
                bestMargin = newMargin;
                initialPosition = {x,y};
            }
        }
    }
    if (!initialPosition) {
        console.log("couldnt find a place to put label");
        return null;
    }

    // Optimize to find the biggest margin
    const solution = nelderMead(
        function(values:number[]) {
            if (isPointInsideRegion(values[0], values[1], sets, excludedSets, setRectangles)) {
                return -getMargin(values[0], values[1], setRectangles);
            } else {
                return Number.POSITIVE_INFINITY;
            }
        },
        [initialPosition.x, initialPosition.y],
        {maxIterations:500}
    ).x;

    return { x: solution[0], y:solution[1] };
}

export function rectangleArea(rectangle:SetRectangles[""]) {
    return rectangle.xLength*rectangle.yLength;
}

export function rectangleDistance(rect1:Rectangle, rect2:Rectangle) {
    const x = (rect1.x - rect2.x);
    const y = (rect1.y - rect2.y);
    return Math.sqrt(x*x + y*y);
}

export function rectangleIntersection(
    ...rectangles:Rectangle[]
):Rectangle {
    if (rectangles.length === 1) {
        return rectangles[0];
    } else if (rectangles.length === 2) {
        const rectA = rectangles[0];
        const rectB = rectangles[1];
        // x direction
        const xMin = Math.max(rectA.x, rectB.x);
        const xMax = Math.min(rectA.x + rectA.xLength, rectB.x + rectB.xLength);
        // y direction
        const yMin = Math.max(rectA.y, rectB.y);
        const yMax = Math.min(rectA.y + rectA.yLength, rectB.y + rectB.yLength);

        if (xMin >= xMax || yMin >= yMax) {
            // no intersection
            return {
                x: 0,
                y: 0,
                xLength: 0,
                yLength: 0
            };
        } else {
            return {
                x: xMin,
                y: yMin,
                xLength: xMax - xMin,
                yLength: yMax - yMin
            };
        }
    } else {
        return rectangleIntersection(
            rectangleIntersection(
                ...rectangles.slice(1)
            ),
            rectangles[0]
        );
    }
}

export function getRegionArea(
    sets:string[],
    setRectangles:SetRectangles
) {
    // start with the intersection size
    let size = rectangleArea(rectangleIntersection(...sets.map(s=>setRectangles[s])));

    // if there are other sets not included in the region, subtract them from the set
    const numSets = Object.keys(setRectangles).length;
    if (sets.length !== numSets) {
        // since max 3 sets total, we know (area.sets, numSets) is either (1,3), (2,3) or (1,2)
        if (sets.length === 2) {
            // numSets is 3
            // so just subtract the intersection of all 3
            size -= rectangleArea(rectangleIntersection(..._.values(setRectangles)));
        } else {
            // area.sets.length is 1
            if (numSets === 2) {
                // just subtract the intersection
                size -= rectangleArea(rectangleIntersection(..._.values(setRectangles)));
            } else {
                // numSets is 3
                // so we need to subtract inclusion/exclusion style
                // WLOG lets call our set A, and theres B and C
                // then area(A) = size(A) - size(A and B) - size(A and C) + size(A and B and C)
                const others = Object.keys(setRectangles).filter(s=> sets[0] !== s);
                const rectA = setRectangles[sets[0]];
                const rectB = setRectangles[others[0]];
                const rectC = setRectangles[others[1]];
                size -= rectangleArea(rectangleIntersection(rectA, rectB));
                size -= rectangleArea(rectangleIntersection(rectA, rectC));
                size += rectangleArea(rectangleIntersection(..._.values(setRectangles)));
            }
        }
    }

    return size;
}

function isPointInsideRectangle(x:number, y:number, rectangle:Rectangle) {
    return ((x > rectangle.x) &&
        (x < rectangle.x + rectangle.xLength) &&
        (y > rectangle.y) &&
        (y < rectangle.y + rectangle.yLength));
}

function isPointInsideRegion(x:number, y:number, sets:string[], excludedSets:string[], setRectangles:SetRectangles) {
    let inside = true;
    for (const set of sets) {
        inside = inside && isPointInsideRectangle(x, y, setRectangles[set]);
    }
    for (const set of excludedSets) {
        inside = inside && !isPointInsideRectangle(x, y, setRectangles[set]);
    }
    return inside;
}

export function getApproximateRegionArea(
    sets:string[],
    setRectangles:SetRectangles
) {
    // for testing
    const xMin = Math.min(...sets.map(setId=>setRectangles[setId].x));
    const xMax = Math.max(...sets.map(setId=>setRectangles[setId].x+setRectangles[setId].xLength));
    const yMin = Math.min(...sets.map(setId=>setRectangles[setId].y));
    const yMax = Math.max(...sets.map(setId=>setRectangles[setId].y+setRectangles[setId].yLength));

    const numSamples = 2000000;
    let numInside = 0;
    const excludedSets = _.difference(Object.keys(setRectangles), sets);
    for (let i=0; i<numSamples; i++) {
        const sampleX = Math.random()*(xMax-xMin) + xMin;
        const sampleY = Math.random()*(yMax-yMin) + yMin;
        numInside += +isPointInsideRegion(sampleX, sampleY, sets, excludedSets, setRectangles);
    }

    return (numInside / numSamples) * (xMax - xMin) * (yMax - yMin);
}

export function lossFunction(
    setRectangles:SetRectangles,
    areas:Area[]
) {
    // NOTE: it seems like zeroAreaPenalty and rectangleRatioPenalty are not necessary, so I've commented them out,
    //      but am leaving them commented in case we run into edge cases where those are an issue.
    let areaError = 0;
    let intersectionDistancePenalty = 0;

    /* UNCOMMENT IF ZERO AREAS SHOW UP
        let areasThatShouldBeZero = 0;
     */
    for (const area of areas) {
        // Make regions proportional to their size
        const regionArea = getRegionArea(area.sets, setRectangles);
        const error = (regionArea - area.preciseSize);
        areaError += error*error;

        if (area.sets.length === 1) {
            // Make each rectangle proportional to its size
            const rectSize = rectangleArea(setRectangles[area.sets[0]]);
            const rectSizeError = (rectSize - area.size);
            areaError += rectSizeError*rectSizeError;
        } else if (area.sets.length === 2 && regionArea === 0 && area.preciseSize > 0) {
            // try to bring each pair of rectangles together if they should intersect and currently dont. Otherwise,
            //  the loss function only detects errors in intersection areas, so won't know how to move them to get better.
            intersectionDistancePenalty += rectangleDistance(
                setRectangles[area.sets[0]], setRectangles[area.sets[1]]
            );
        }

        /* UNCOMMENT IF ZERO AREAS SHOW UP
        if (area.preciseSize === 0) {
            if (size >= 0) {
                areasThatShouldBeZero += size;
            }
        }*/
    }

    // pressure to not have any areas representing zero be nonzero in the plot
    const zeroAreaPenalty = 0;// UNCOMMENT IF ZERO AREAS SHOW UP: 5*areasThatShouldBeZero;

    // pressure to make the log ratio no bigger (i.e. rectangles no thinner) than 1.3, but
    //  dont offer any reward after that for continuing to shrink the ratio
    const smallestRectangleLogRatio = Math.min(..._.map(setRectangles, rectangle=>{
        return Math.abs(Math.log(rectangle.xLength / rectangle.yLength));
    }));

    const rectangleRatioPenalty = 0;// UNCOMMENT IF EXCESSIVELY THIN RECTANGLES show UP: Math.max(smallestRectangleLogRatio, Math.log(1.3));

    return areaError + zeroAreaPenalty + rectangleRatioPenalty + intersectionDistancePenalty;
}

export function computeVennLayout(areas:Area[], parameters:any) {
    // based on https://github.com/benfred/venn.js/blob/master/src/layout.js#L7
    parameters = parameters || {};
    //parameters.maxIterations = parameters.maxIterations || 500;
    const loss = lossFunction;

    // Base our initial layout on the VennJs library's initial layout for circles.
    const initialLayout = VennJs.bestInitialLayout(areas, parameters);
    const initialRectangles:SetRectangles = _.mapValues(initialLayout, circle=>({
        x: circle.x - circle.radius,
        y: circle.y - circle.radius,
        xLength: 2*circle.radius,
        yLength: 2*circle.radius
    }));

    const rectangleToVector = (rect:Rectangle)=>{
        return [rect.x + rect.xLength / 2, rect.y + rect.yLength / 2,
                rect.xLength/2, rect.xLength/2, rect.yLength/2, rect.yLength/2];

        // This parametrization is useful because it allows free exploration of the parameter space in
        //  a way that is relevant to the problem.
        // To be more precise, with this parametrization each side can be moved independently
        //  by a change in a single dimension, and the x and y each can be moved independently
        //  by a change in a single dimension.
        //
        // Its advantage over Parametrization A = [x, y, width, height] is that it can freely move each of the sides
        //  of the rectangle, whereas Param. A would need to alter both width and x synchronously in order
        //  to move the rectangles left side while maintaining the rest of the rectangle sides in place.
        //
        // Its advantage over Parametrization B = [x1, y1, x2, y2] is that it can move the entire rectangle easily,
        //  whereas to change x in Param. B you'd need to alter both x1 and x2 synchronously.
    };

    const vectorToRectangle = (i:number, vector:number[])=>{
        // This is completely tied to `rectangleToVector` - if one is rewritten then so must the other be so that they are inverses.
        const centerX = vector[6*i];
        const centerY = vector[6*i + 1];
        const leftXLength = Math.abs(vector[6*i + 2]);
        const xLength = leftXLength + Math.abs(vector[6*i+3]);
        const bottomYLength = Math.abs(vector[6*i+4]);
        const yLength = bottomYLength + Math.abs(vector[6*i + 5]);
        const x = centerX - leftXLength;
        const y = centerY - bottomYLength;
        return {x,y,xLength,yLength};
    };

    // transform x/y coordinates to a vector to pass to the optimization algorithm
    const initial:number[] = [];
    const setIds:string[] = [];
    for (const setId of Object.keys(initialRectangles)) {
        if (initialRectangles.hasOwnProperty(setId)) {
            initial.push(...rectangleToVector(initialRectangles[setId]));
            setIds.push(setId);
        }
    }

    // optimize initial layout from our loss function
    const solution = nelderMead(
        function(values:number[]) {
            const current:SetRectangles = {};
            for (let i=0; i<setIds.length; i++) {
                const setId = setIds[i];
                current[setId] = vectorToRectangle(i, values);
            }
            return loss(current, areas);
        },
        initial,
        parameters);

    // transform solution vector back to x/y points
    const rectangles:SetRectangles = {};
    const values = solution.x;
    for (let i=0; i<setIds.length; i++) {
        const setId = setIds[i];
        rectangles[setId] = vectorToRectangle(i, values);
    }

    return rectangles;
}

export function scaleSolution(solution:SetRectangles, width:number, height:number, padding:number) {
    // Based on https://github.com/benfred/venn.js/blob/d5a47bd12140f95a17402c6356af4631f53a0723/src/layout.js#L635

    function getBoundingBox(rectangles:Rectangle[]) {
        return {
            xRange:{
                min: Math.min(...rectangles.map(r=>r.x)),
                max: Math.max(...rectangles.map(r=>r.x + r.xLength))
            },
            yRange:{
                min: Math.min(...rectangles.map(r=>r.y)),
                max: Math.max(...rectangles.map(r=>r.y + r.yLength))
            }
        };
    }

    const rectangles = _.values(solution);
    const setIds = Object.keys(solution);

    width -= 2*padding;
    height -= 2*padding;

    const bounds = getBoundingBox(rectangles);
    const xRange = bounds.xRange;
    const yRange = bounds.yRange;

    if ((xRange.max == xRange.min) ||
        (yRange.max == yRange.min)) {
        console.log("not scaling solution: zero size detected");
        return solution;
    }

    const xScaling = width  / (xRange.max - xRange.min);
    const yScaling = height / (yRange.max - yRange.min);
    const scaling = Math.min(yScaling, xScaling);

    // while we're at it, center the diagram too
    const xOffset = (width -  (xRange.max - xRange.min) * scaling) / 2;
    const yOffset = (height - (yRange.max - yRange.min) * scaling) / 2;

    const scaled:SetRectangles = {};
    for (let i = 0; i < rectangles.length; ++i) {
        const rect = rectangles[i];
        scaled[setIds[i]] = {
            xLength: scaling * rect.xLength,
            yLength: scaling * rect.yLength,
            x: padding + xOffset + (rect.x - xRange.min) * scaling,
            y: padding + yOffset + (rect.y - yRange.min) * scaling,
        };
    }

    return scaled;
}