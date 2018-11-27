import {ResultsViewPageStore} from "../ResultsViewPageStore";
import * as React from "react";
import {observer} from "mobx-react";
// TODO import PathwayMapper from "pathway-mapper" -- in order this import to work, "pathway-mapper" should be published as an npm module

export interface IPathwayMapperProps {
    store: ResultsViewPageStore;
}

@observer
export default class PathwayMapper extends React.Component<IPathwayMapperProps, {}>
{
    constructor(props: IPathwayMapperProps) {
        super(props);
    }

    public render() {
        return <div>PathwayMapper...</div>;
    }
}