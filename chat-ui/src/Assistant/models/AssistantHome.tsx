import { Link, HalObject, HalSlice } from "@contentgrid/hal";
import type { HalObjectShape, HalSliceShape, LinkShape } from "@contentgrid/hal/shape";

export type AgentShape = HalObjectShape<{
    name: string;
    version: string;
}> & {
    _links: {
        self: Link;
        threads: Link;
        tools: Link;
    };
};

export class Agent extends HalObject<AgentShape> {
    constructor(data: AgentShape) {
        super(data);
    }

    get name() {
        return this.data.name;
    }

    get version() {
        return this.data.version;
    }
}

export interface AgentSliceShape extends HalSliceShape<AgentShape> {
    _links: {
        self: LinkShape;
    };
}

export class AgentSlice extends HalSlice<AgentShape> {
    constructor(data: AgentSliceShape) {
        super(data);
    }

    get agents(): Agent[] {
        return this.data._embedded?.['agents'].map((agent: AgentShape) => {
            return new Agent(agent as AgentShape);
        }) || [];
    }
}

// Backward compatibility aliases
export type HomeShape = AgentSliceShape;

