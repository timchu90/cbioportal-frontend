import * as React from 'react';
import {
	Mutation,
	DiscreteCopyNumberData
} from 'shared/api/generated/CBioPortalAPI';

interface PanelColumnFormatterProps {
	data: Mutation[] | DiscreteCopyNumberData[];
	sampleToMutationGenePanelId: {[sampleId:string]: string} | undefined;
}

class PanelColumn extends React.Component<PanelColumnFormatterProps, {}> {
	constructor(props: PanelColumnFormatterProps) {
		super(props);
	}

	render() {
    const { data, sampleToMutationGenePanelId } = this.props;
    
    if (!sampleToMutationGenePanelId) return;

		if (sampleToMutationGenePanelId && !Object.keys(sampleToMutationGenePanelId).length) {
			return <i className='fa fa-spinner fa-pulse' />;
		}

		const genePanelIds: string[] = getGenePanelIds(
			data,
			sampleToMutationGenePanelId
		);

		return (
			<div style={{ position: 'relative' }}>
				<ul style={{ marginBottom: 0 }} className='list-inline list-unstyled'>
					{genePanelIds.join(', ')}
				</ul>
			</div>
		);
	}
}

const getGenePanelIds = (
	data: any[],
	sampleToMutationGenePanelId: {[sampleId:string]: string} | undefined
) => {
  if (sampleToMutationGenePanelId) {
    const sampleIds = data.map((datum) => datum.sampleId);
    return sampleIds.map((id) => sampleToMutationGenePanelId[id]);
  }
  return [];
};

export default {
	renderFunction: (
		data: Mutation[] | DiscreteCopyNumberData[],
		sampleToMutationGenePanelId: {[sampleId:string]: string} | undefined
	) => (
		<PanelColumn
			data={data}
			sampleToMutationGenePanelId={sampleToMutationGenePanelId}
		/>
	),
	download: (
		data: Mutation[] | DiscreteCopyNumberData[],
		sampleToMutationGenePanelId: {[sampleId:string]: string} | undefined
	) => getGenePanelIds(data, sampleToMutationGenePanelId),
	getGenePanelIds
};
