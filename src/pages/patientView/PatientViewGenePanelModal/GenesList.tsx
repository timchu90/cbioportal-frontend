import * as React from 'react';
import { GenePanel, GenePanelToGene } from 'shared/api/generated/CBioPortalAPI';
import { observer } from 'mobx-react';
import { SimpleCopyDownloadControls } from 'shared/components/copyDownloadControls/SimpleCopyDownloadControls';
import { serializeData } from 'shared/lib/Serializer';
import './styles.scss';
import { chunk } from 'lodash';

interface IGenesListProps {
    genePanelCache: GenePanel;
    panelName: string;
    columns?: number;
    id?: string | undefined;
}

interface IGenesListState {
    filter: string;
}

@observer
export default class PatientViewGenePanelModal extends React.Component<
    IGenesListProps,
    IGenesListState
> {
    constructor(props: IGenesListProps) {
        super(props);
        this.state = {
            filter: '',
        };
    }

    handleChangeInput = (value: string) => {
        this.setState({ filter: value });
    };

    filterGenes = () => {
        const { genes } = this.props.genePanelCache;
        const { filter } = this.state;
        if (filter) {
            const lowerCaseFilter = filter.toLowerCase();
            return genes.filter(
                each =>
                    each.entrezGeneId.toString().includes(lowerCaseFilter) ||
                    each.hugoGeneSymbol.toLowerCase().includes(lowerCaseFilter)
            );
        }
        return genes;
    };

    genesDividedToColumns = (genes: GenePanelToGene[]) => {
        return chunk(genes, this.genesCountPerColumn(genes.length));
    };

    renderColumns = () => {
        const filtered = this.filterGenes();
        if (filtered.length === 0) {
            return <td>No matches.</td>;
        }
        return this.genesDividedToColumns(filtered).map(col => (
            <td>
                {col.map(each => (
                    <p key={each.entrezGeneId}>{each.hugoGeneSymbol}</p>
                ))}
            </td>
        ));
    };

    getDownloadData = () => {
        const downloadData = [['Genes'], ...this.genesDividedToRows()];
        return serializeData(downloadData);
    };

    genesDividedToRows = () => {
        const { genes } = this.props.genePanelCache;
        const genesByColumns = this.genesDividedToColumns(genes);
        const genesByRows = [];
        for (let i = 0; i < this.genesCountPerColumn(genes.length); i++) {
            const genesPerRow = [];
            for (let j = 0; j < this.columnsCount(); j++) {
                genesPerRow.push(
                    genesByColumns[j][i]
                        ? genesByColumns[j][i].hugoGeneSymbol
                        : ''
                );
            }
            genesByRows.push(genesPerRow);
        }
        return genesByRows;
    };

    columnsCount = () => {
        return this.props.columns || 1;
    };

    genesCountPerColumn = (totalLength: number) => {
        return Math.ceil(totalLength / this.columnsCount());
    };

    render() {
        return (
            <div id={this.props.id}>
                <h4 className="modal-title panel-name">
                    {this.props.panelName}
                </h4>
                <span>
                    Number of genes: {this.props.genePanelCache.genes.length}
                </span>
                <div className="pull-right has-feedback input-group-sm">
                    <input
                        type="text"
                        value={this.state.filter}
                        onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                            this.handleChangeInput(e.target.value)
                        }
                        className="form-control"
                    />
                    <span
                        className="fa fa-search form-control-feedback"
                        aria-hidden="true"
                    />
                </div>
                <SimpleCopyDownloadControls
                    className="pull-right"
                    downloadData={this.getDownloadData}
                    downloadFilename={`gene_panel_${this.props.panelName}.tsv`}
                    controlsStyle="BUTTON"
                    containerId={this.props.id}
                />
                <table>
                    <thead>
                        <th>Genes</th>
                    </thead>
                    <tbody>
                        <tr>{this.renderColumns()}</tr>
                    </tbody>
                </table>
            </div>
        );
    }
}
