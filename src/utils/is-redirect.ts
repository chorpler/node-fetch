const redirectStatus = new Set([301, 302, 303, 307, 308]);

/**
 * Redirect code matching
 *
 * @param {number} code - Status code
 * @return {boolean}
 */
export const isRedirect = (code:number):boolean => {
	return redirectStatus.has(code);
};
