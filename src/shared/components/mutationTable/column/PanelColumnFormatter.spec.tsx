import PanelColumnFormatter from "./PanelColumnFormatter";
import { shallow } from "enzyme";
import { assert } from 'chai';

const mockData = [
  {
    alteration: 1,
    entrezGeneId: 1,
    gene: { 
      entrezGeneId: 1, 
      hugoGeneSymbol: 'test', 
      geneticEntityId: 1, 
      type: 'test'
    },
    molecularProfileId: 'test',
    patientId: 'test',
    sampleId: 'sampleId',
    studyId: 'test',
    uniquePatientKey: 'test',
    uniqueSampleKey: 'test',
  }
];

const mockSampleToMutationGenePanelId = { 'sampleId': 'genePanelId' };

describe("PanelColumnFormatter", () => {
  it('renders spinner icon if sampleToMutationGenePanelId object is empty', () => {
    const PanelColumn = shallow(PanelColumnFormatter.renderFunction(mockData, {}));
    assert.isTrue(PanelColumn.find('i.fa-spinner').exists());
  });
  
  it('renders gene panel information', () => {
    const PanelColumn = shallow(PanelColumnFormatter.renderFunction(
      mockData,
      mockSampleToMutationGenePanelId
    ));
    assert.isTrue(PanelColumn.text().includes('genePanelId'));
  });
  
  it('returns a list of gene panel ids on download', () => {
    const genePanelIds = PanelColumnFormatter.download(mockData, mockSampleToMutationGenePanelId);
    assert.deepEqual(genePanelIds, ['genePanelId'])
  });
  
  it('returns a list of gene panel ids on getGenePanelIds', () => {
    const genePanelIds = PanelColumnFormatter.getGenePanelIds(mockData, mockSampleToMutationGenePanelId);
    assert.deepEqual(genePanelIds, ['genePanelId'])
  })
})
