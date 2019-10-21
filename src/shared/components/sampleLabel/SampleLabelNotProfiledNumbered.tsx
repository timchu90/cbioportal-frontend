import * as React from 'react';

const color = '#dddddd';
const fillOpacity = 1;

export interface ISampleLabelNotProfiledNumberedSVGProps {
    label: string;
}

export class SampleLabelNotProfiledNumbered extends React.Component<ISampleLabelNotProfiledNumberedSVGProps, {}> {
    constructor(props: ISampleLabelNotProfiledNumberedSVGProps) {
        super(props);
        this.render = this.render.bind(this);
    }

    public render() {
        const { label } = this.props;
        return (
            <svg width='12' height='12' className='case-label-header' data-test="sample-icon">
                <g transform='translate(6,6)'>
                    <circle r='6' fill={color} fillOpacity={fillOpacity} />
                </g>
                <g transform="translate(0.5,5.5)">
                    <path
                        style={{fill:"none", stroke:"#cccccc", strokeWidth:2.5, strokeLinecap:"butt", strokeLinejoin:"miter", strokeMiterlimit:4, strokeDasharray:"none", strokeOpacity:1}}
                        d="M 0,6 11,-5" />
                </g>
                <g transform='translate(6,5.5)'>
                    <text y='4' textAnchor='middle' fontSize='10' fill='white' style={{cursor:"default"}} >{label}</text>
                </g>
            </svg>
        );
    }
}