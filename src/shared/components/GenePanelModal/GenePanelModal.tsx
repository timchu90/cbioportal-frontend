import * as React from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";

interface IGeneModalProps {
    panelName: string;
    show: boolean;
    hide: () => void;
    isLoading?: boolean;
}

@observer
export default class GenePanelModal extends React.Component<IGeneModalProps, {}> {
    render() {
        return (
            <Modal show={this.props.show} onHide={this.props.hide} keyboard>
                <Modal.Header closeButton>
                    <Modal.Title data-test="gene-panel-modal-title">{this.props.panelName}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{maxHeight: "calc(100vh - 210px)", overflowY: "auto"}}>
                    {this.props.show && this.props.isLoading &&
                        <LoadingIndicator isLoading={true}/>
                    }
                    {this.props.show && !this.props.isLoading &&
                        <div data-test="gene-panel-modal-body">
                            {this.props.children}
                        </div>
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button data-test="modal-button" onClick={this.props.hide}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
};
