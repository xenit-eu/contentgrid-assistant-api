import { HalObject, HalSlice } from "@contentgrid/hal";
import type { HalFormsTemplateShape } from "@contentgrid/hal-forms/shape";
import type { HalObjectShape, HalSliceShape, LinkShape } from "@contentgrid/hal/shape";

export interface ThreadSliceShape extends HalSliceShape<ThreadShape> {
    _links: {
        self: LinkShape;
        assistant: LinkShape;
    };
    _templates: {
        'startThread' : HalFormsTemplateShape<ThreadCreate, Thread>;
    };
}

export class ThreadSlice extends HalSlice<ThreadShape> {
    public _templates : ThreadSliceShape['_templates']

    constructor(data: ThreadSliceShape) {
        super(data)
        this._templates = data._templates
    }

    get threads() : Thread[] {
        return this.data._embedded?.['threads'].map((thread : ThreadShape) =>{
        return new Thread(thread as ThreadShape)
     })
    }
}

type ThreadObject = {
    created_at: number;
    name : string;
    id: string;
}

export type ThreadShape = HalObjectShape<ThreadObject> & {
    _links: {
        self: LinkShape;
        messages: LinkShape;
        blueprint: LinkShape;
    };
    _templates : {
        'delete' : HalFormsTemplateShape<null, {message : string}>;
        'update' : HalFormsTemplateShape<ThreadUpdate, Thread>;
    }
};

export class Thread extends HalObject<ThreadShape> {
    public _templates : ThreadShape['_templates']
    constructor(data: ThreadShape) {
        super(data)
        this._templates = data._templates
    }

    get name() {
        return this.data.name
    }
}
// export type ThreadSlice = HalSlice<ThreadShape>;

export type ThreadCreate = {
    // pass no params for now
    // Would be good to be able to the include context of the thread pass that here.
}

export type ThreadUpdate = {
    newName : string
}

