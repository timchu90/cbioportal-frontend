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
import {event as currentEvent} from 'd3';

export interface IAdmixBarPlotProps {
    promise: MobxPromise<AdmixtureType[]>;
    width: number;
    height: number;
    filters: ClinicalDataIntervalFilterValue[];
}

@observer
export default class AdmixBarPlot extends React.Component<IAdmixBarPlotProps, {}> implements AbstractChart{
    
    private svgElement: SVGElement;
    private tooltipElement: any;
    
    constructor(props: IAdmixBarPlotProps) {
        super(props);
    }
    
    public toSVGDOMNode(): Element {
        return this.svgElement
    }
    
    public componentDidMount() {
        var svg = d3.select(this.svgElement)
        var margin = 20
        var width = this.props.width;
        var height = this.props.height;
        var xshift = 70
        var x = d3.scale.linear().range([xshift,width-50]).domain([0,1000])
        var y = d3.scale.linear().range([0,height]).domain([0,1.2])
        var scale = d3.scale.linear().range([0,height]).domain([0,1000])

        var populations = ['ADMIX_AFR','ADMIX_AMR','ADMIX_EAS','ADMIX_EUR','ADMIX_SAS']
        var populationColors = ['#2986e2','#f88508','#dc3912','#109618','#990099']

        var colorScale = d3.scale.ordinal().range(populationColors).domain(populations)

        var div = d3.select(this.tooltipElement).append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style('position','fixed')
            .style('text-align','left')
            .style('width','120px')
            .style('height','50px')
            .style('padding-left','10px')
            .style('padding-top','5px')
            .style('border','0.5px solid gray')
            .style('background','white')
            .style('border-radius','5px')
            .style('pointer-events','none')
            .style('box-shadow', '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)')

        var yaxis = svg.append("g")
            .attr('class', 'yaxis')
            .attr('transform','translate(' + x(-25) + ',' + y(0.05) + ')')
            
        
        yaxis.append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', y(0))
            .attr('y2', y(1))
            .attr('stroke','black')
        
        yaxis.append('line')
            .attr('x1', 0)
            .attr('x2', -5)
            .attr('y1', y(0))
            .attr('y2', y(0))
            .attr('stroke','black')
        
        yaxis.append('line')
            .attr('x1', 0)
            .attr('x2', -5)
            .attr('y1', y(0.5))
            .attr('y2', y(0.5))
            .attr('stroke','black')
        
        yaxis.append('line')
            .attr('x1', 0)
            .attr('x2', -5)
            .attr('y1', y(1))
            .attr('y2', y(1))
            .attr('stroke','black')
        
        yaxis.append('text')
            .text('1.0')
            .attr('x', -10)
            .attr('y', y(0))
            .attr('text-anchor','end')
            .attr('font-size', 12.5)
            .attr('dy', 3)
        
        yaxis.append('text')
            .text('0.5')
            .attr('x', -10)
            .attr('y', y(0.5))
            .attr('text-anchor','end')
            .attr('font-size', 12.5)
            .attr('dy',3)
        
        yaxis.append('text')
            .text('0.0')
            .attr('x', -10)
            .attr('y', y(1))
            .attr('text-anchor','end')
            .attr('font-size', 12.5)
            .attr('dy',3)
        
        yaxis.append('text')
            .text('Admixture Proportion')
            .attr('x', -40)
            .attr('y', y(0.5))
            .attr('transform','rotate(270,' + -40 + ',' + y(0.5) + ')')
            .attr('text-anchor','middle')
            .attr('font-size', 12.5)
            .attr('dy',scale(15))

      //start drawing actual data
      
        var data = this.props.promise.result

        var bars = svg.append('g').attr('class','bars')
        
        var bar = bars.selectAll('.bar')
            .data(data).enter()
            .append('g')
            .attr('transform',function(d: any,i: number){
                return 'translate(' + x(1000/data!.length * i)  + ',' + y(0.05) + ')'
            })
        
        for (var i in populations){
            bar.append('rect')
                .attr('class', populations[i])
                .attr('width', function(){
                    var width = x(1000/data!.length)-xshift-0.5
                    if (width > 75) {
                        return 75
                    }
                    else {
                        return width
                    }
                })
                .attr('height', function(d: any) { return y(d[populations[i]])})
                .attr('fill', colorScale(populations[i]))
                .attr('y', function(d: any) {
                    if (Number(i) > 0){
                        var yshift = 0
                        for (var j = 0; j < Number(i) ; j++){
                            yshift = yshift + parseFloat(d[populations[j]])
                        }
                        return y(yshift)
                    } else {
                        return 0
                    }
                })
                .on('mousemove',function(d: any,i: number){
                    var population = d3.select(this).attr('class')
                    //https://github.com/facebook/react/issues/6641#issuecomment-267365773
                    div.html("<b>" + d.patientId + "</b>" + "<br>" +
                            "<b>" + population + ":</b>" + d[population])
                    .style("left", function(){
                        return (currentEvent.clientX + 10) + "px"
                    })
                    .style("top", function(){
                        return (currentEvent.clientY + 10) + "px"
                    })
                    .style("opacity", 1)
                })
                .on('mouseout',function(d: any){
                    div.style('opacity',0)
                })
        }
    }
    
    public render() {
        return (
            <div 
                ref={(ref: any) => this.tooltipElement = ref}
                >
                <svg
                    width={this.props.width}
                    height={this.props.height}
                    ref={(ref: any) => this.svgElement = ref}
                >
                </svg>
            </div>
        );
    }
    
}