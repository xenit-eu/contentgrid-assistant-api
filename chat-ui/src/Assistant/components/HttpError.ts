import { fromResponse } from "@contentgrid/problem-details";

export class HttpError extends Error {
    public constructor(
        public readonly method: string,
        public readonly url: string,
        message: string,
    ) {
        super('HTTP request ' + method + ' ' + url + ' failed: ' + message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HttpError.name;
        if ((Error as any).captureStackTrace) {
            (Error as any).captureStackTrace(this, HttpError);
        }
    }
}

export class HttpAbortedError extends HttpError {
    public constructor(method: string, url: string) {
        super(method, url, 'aborted');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HttpAbortedError.name;
    }
}

export class HttpResponseError extends HttpError {
    readonly statusCode: number;

    public constructor(
        method: string,
        url: string,
        private readonly response: Response,
    ) {
        super(method, url, 'Response code: ' + response.status);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = response.status;
        this.name = HttpResponseError.name;
    }

    public json() {
        return this.response.json();
    }

    public get isClientError(): boolean {
        return this.statusCode >= 400 && this.statusCode < 500;
    }

    public get isServerError(): boolean {
        return this.statusCode >= 500;
    }
}

export class HttpJsonError extends HttpResponseError {
    public constructor(method: string, url: string, response: Response, body: { message: string }) {
        super(method, url, response);
        this.message = body.message;
    }

    public static async tryFromResponse(method: string, url: string, response: Response): Promise<HttpResponseError> {
        let contentType = response.headers.get('Content-Type');
        if (contentType === 'application/json' || contentType === 'application/prs.hal-forms+json') {
            let json = await response.json();
            if (Object.keys(json).includes('message')) {
                return new HttpJsonError(method, url, response, json);
            }
        }
        const problemDetail = await fromResponse(response);
        if (problemDetail) {
            return new ProblemDetailHttpError(method, url, response, problemDetail);
        }
        return new HttpResponseError(method, url, response);
    }
}

export class ProblemDetailHttpError extends HttpResponseError {
    public constructor(method: string, url: string, response: Response, problemDetail: ProblemDetail) {
        super(method, url, response)
        const suggestedMessage = problemDetail.detail ?? problemDetail.title;
        if (suggestedMessage) {
            this.message = suggestedMessage;
        }
    }
}
