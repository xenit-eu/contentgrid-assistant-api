import AssistantDataFetcher from './AssistantDataFetcher';
import IAssistantDataFetcher from './IAssistantDataFetcher';

const dataFetcher: IAssistantDataFetcher = new AssistantDataFetcher(
    "http://localhost:5003/",
    "",
    ""
);
export default dataFetcher;