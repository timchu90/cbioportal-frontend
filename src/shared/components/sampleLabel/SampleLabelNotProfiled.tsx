import React from "react";
import { ClinicalDataBySampleId } from "shared/api/api-types-extended";
import SampleInline from "pages/patientView/patientHeader/SampleInline";

export interface ISampleLabelNotProfiledProps {
    sample: ClinicalDataBySampleId;
}

export default class SampleLabelNotProfiled extends React.Component<ISampleLabelNotProfiledProps, {}>{

    public render() {
        return (
            <SampleInline
                sample={this.props.sample}
                extraTooltipText={'This gene was not profiled for this sample (absent from gene panel). It is unknown whether it is mutated.'} >
                <svg width="12" height="12" data-test="not-profiled-icon">
                    <image href={require("../../../rootImages/question-mark.png")} height="100%" width="100%" />
                </svg>
            </SampleInline>)
        ;
    }

}