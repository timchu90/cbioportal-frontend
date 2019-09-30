import * as React from 'react';
import { GenePanel } from 'shared/api/generated/CBioPortalAPI';
import { observer } from 'mobx-react';
import GenePanelModal from 'shared/components/GenePanelModal/GenePanelModal';
import GenesList from './GenesList';

interface IGenePanelModalProps {
    genePanelCache: GenePanel;
    panelName: string;
    show: boolean;
    hide: () => void;
    columns?: number;
}

@observer
export default class PatientViewGenePanelModal extends React.Component<
    IGenePanelModalProps,
    {}
> {
    render() {
        return (
            <GenePanelModal
                panelName="Gene Panel"
                show={this.props.show}
                hide={this.props.hide}
                isLoading={!this.props.genePanelCache}
            >
                {this.props.genePanelCache && (
                    <GenesList
                        id="patient-view-gene-panel"
                        genePanelCache={this.props.genePanelCache}
                        panelName={this.props.panelName}
                        columns={this.props.columns}
                    />
                )}
            </GenePanelModal>
        );
    }
}
