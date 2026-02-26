import { createRelations} from "@contentgrid/hal/rels"


export default createRelations(["thread", "threads", "messages"] as const)