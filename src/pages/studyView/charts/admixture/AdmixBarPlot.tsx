import * as React from "react";
import {observer} from "mobx-react";
import {VictoryAxis, VictoryBar, VictoryChart, VictorySelectionContainer} from 'victory';
import {computed} from "mobx";
import MobxPromise from "mobxpromise";
import _ from "lodash";
import CBIOPORTAL_VICTORY_THEME from "shared/theme/cBioPoralTheme";
import {ClinicalDataIntervalFilterValue, DataBin} from "shared/api/generated/CBioPortalAPIInternal";
import {AbstractChart} from "pages/studyView/charts/ChartContainer";
import autobind from 'autobind-decorator';
import {STUDY_VIEW_CONFIG} from "../../StudyViewConfig";
import {getTextDiagonal, getTextHeight, getTextWidth} from "../../../../shared/lib/wrapText";
import {AdmixtureType} from "pages/studyView/StudyViewPageStore";
import * as d3 from "d3"

export interface IAdmixBarPlotProps {
    promise: MobxPromise<AdmixtureType>;
    width: number;
    height: number;
    filters: ClinicalDataIntervalFilterValue[];
}

@observer
export default class AdmixBarPlot extends React.Component<IAdmixBarPlotProps, {}> implements AbstractChart{
    
    private svgElement: SVGElement;
    
    constructor(props: IAdmixBarPlotProps) {
        super(props);
    }
    
    public toSVGDOMNode(): Element {
        return this.svgElement
    }
    
    public componentDidMount() {
        const svg = d3.select("svg")
        svg.append('text')
            .text('hello world')
            .attr('x', 10)
            .attr('y',10)
    }
    
    shouldComponentUpdate() {
        return false; 
    }
    
    public render() {
        return (
            <svg
                width={this.props.width}
                height={this.props.height}
                ref={(ref: any) => this.svgElement = ref}
            >
            </svg>
        );
    }
    
}