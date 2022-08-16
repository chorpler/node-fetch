export class FetchBaseError extends Error {
	public type:string;
	constructor(message:string, type?:string) {
		super(message);
		// Hide custom error implementation details from end-users
		Error.captureStackTrace(this, this.constructor);

		this.type = typeof type === 'string' ? type : "";
	}

	get name() {
		return this.constructor.name;
	}

	get [Symbol.toStringTag]() {
		return this.constructor.name;
	}
}
