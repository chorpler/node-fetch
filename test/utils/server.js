import http from 'http';
import zlib from 'zlib';
import {once} from 'events';
import busboy from 'busboy';

export default class TestServer {
	constructor(hostname) {
		this.server = http.createServer(this.router);
		// Node 8 default keepalive timeout is 5000ms
		// make it shorter here as we want to close server quickly at the end of tests
		this.server.keepAliveTimeout = 1000;
		this.server.on('error', err => {
			console.log(err.stack);
		});
		this.server.on('connection', socket => {
			socket.setTimeout(1500);
		});
		this.hostname = hostname || 'localhost';
	}

	async start() {
		let host = this.hostname;
		if (host.startsWith('[')) {
			// If we're trying to listen on an IPv6 literal hostname, strip the
			// square brackets before binding to the IPv6 address
			host = host.slice(1, -1);
		}

		this.server.listen(0, host);
		return once(this.server, 'listening');
	}

	async stop() {
		this.server.close();
		return once(this.server, 'close');
	}

	get port() {
		return this.server.address().port;
	}

	mockResponse(responseHandler) {
		this.server.nextResponseHandler = responseHandler;
		return `http://${this.hostname}:${this.port}/mocked`;
	}

	router(request, res) {
		const p = request.url;

		if (p === '/mocked') {
			if (this.nextResponseHandler) {
				this.nextResponseHandler(res);
				this.nextResponseHandler = undefined;
			} else {
				throw new Error('No mocked response. Use ’TestServer.mockResponse()’.');
			}
		}

		if (p === '/hello') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('world');
		}

		if (p.includes('question')) {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('ok');
		}

		if (p === '/plain') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('text');
		}

		if (p === '/no-status-text') {
			res.writeHead(200, '', {}).end();
		}

		if (p === '/options') {
			res.statusCode = 200;
			res.setHeader('Allow', 'GET, HEAD, OPTIONS');
			res.end('hello world');
		}

		if (p === '/html') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/html');
			res.end('<html></html>');
		}

		if (p === '/json') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({
				name: 'value'
			}));
		}

		if (p === '/gzip') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'gzip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				res.end(buffer);
			});
		}

		if (p === '/gzip-truncated') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'gzip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				// Truncate the CRC checksum and size check at the end of the stream
				res.end(buffer.slice(0, -8));
			});
		}

		if (p === '/gzip-capital') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'GZip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				res.end(buffer);
			});
		}

		if (p === '/deflate') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'deflate');
			zlib.deflate('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				res.end(buffer);
			});
		}

		if (p === '/brotli') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			if (typeof zlib.createBrotliDecompress === 'function') {
				res.setHeader('Content-Encoding', 'br');
				zlib.brotliCompress('hello world', (err, buffer) => {
					if (err) {
						throw err;
					}

					res.end(buffer);
				});
			}
		}

		if (p === '/deflate-raw') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'deflate');
			zlib.deflateRaw('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				res.end(buffer);
			});
		}

		if (p === '/empty/deflate') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'deflate');
			res.end();
		}

		if (p === '/sdch') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'sdch');
			res.end('fake sdch string');
		}

		if (p === '/invalid-content-encoding') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Encoding', 'gzip');
			res.end('fake gzip string');
		}

		if (p === '/timeout') {
			setTimeout(() => {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/plain');
				res.end('text');
			}, 1000);
		}

		if (p === '/slow') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.write('test');
			setTimeout(() => {
				res.end('test');
			}, 1000);
		}

		if (p === '/cookie') {
			res.statusCode = 200;
			res.setHeader('Set-Cookie', ['a=1', 'b=1']);
			res.end('cookie');
		}

		if (p === '/size/chunk') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			setTimeout(() => {
				res.write('test');
			}, 10);
			setTimeout(() => {
				res.end('test');
			}, 20);
		}

		if (p === '/size/long') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('testtest');
		}

		if (p === '/redirect/301') {
			res.statusCode = 301;
			res.setHeader('Location', '/inspect');
			res.end();
		}

		if (p === '/redirect/301/invalid') {
			res.statusCode = 301;
			res.setHeader('Location', '//super:invalid:url%/');
			res.end();
		}

		if (p.startsWith('/redirect-to/3')) {
			res.statusCode = p.slice(13, 16);
			res.setHeader('Location', p.slice(17));
			res.end();
		}

		if (p === '/redirect/301/otherhost') {
			res.statusCode = 301;
			res.setHeader('Location', 'https://github.com/node-fetch');
			res.end();
		}

		if (p === '/redirect/302') {
			res.statusCode = 302;
			res.setHeader('Location', '/inspect');
			res.end();
		}

		if (p === '/redirect/303') {
			res.statusCode = 303;
			res.setHeader('Location', '/inspect');
			res.end();
		}

		if (p === '/redirect/307') {
			res.statusCode = 307;
			res.setHeader('Location', '/inspect');
			res.end();
		}

		if (p === '/redirect/308') {
			res.statusCode = 308;
			res.setHeader('Location', '/inspect');
			res.end();
		}

		if (p === '/redirect/chain') {
			res.statusCode = 301;
			res.setHeader('Location', '/redirect/301');
			res.end();
		}

		if (p === '/redirect/no-location') {
			res.statusCode = 301;
			res.end();
		}

		if (p === '/redirect/slow') {
			res.statusCode = 301;
			res.setHeader('Location', '/redirect/301');
			setTimeout(() => {
				res.end();
			}, 1000);
		}

		if (p === '/redirect/slow-chain') {
			res.statusCode = 301;
			res.setHeader('Location', '/redirect/slow');
			setTimeout(() => {
				res.end();
			}, 10);
		}

		if (p === '/redirect/slow-stream') {
			res.statusCode = 301;
			res.setHeader('Location', '/slow');
			res.end();
		}

		if (p === '/redirect/bad-location') {
			res.socket.write('HTTP/1.1 301\r\nLocation: <>\r\nContent-Length: 0\r\n');
			res.socket.end('\r\n');
		}

		if (p === '/redirect/referrer-policy') {
			res.statusCode = 301;
			res.setHeader('Location', '/inspect');
			res.setHeader('Referrer-Policy', 'foo unsafe-url bar');
			res.end();
		}

		if (p === '/redirect/referrer-policy/same-origin') {
			res.statusCode = 301;
			res.setHeader('Location', '/inspect');
			res.setHeader('Referrer-Policy', 'foo unsafe-url same-origin bar');
			res.end();
		}

		if (p === '/redirect/chunked') {
			res.writeHead(301, {
				Location: '/inspect',
				'Transfer-Encoding': 'chunked'
			});
			setTimeout(() => res.end(), 10);
		}

		if (p === '/error/400') {
			res.statusCode = 400;
			res.setHeader('Content-Type', 'text/plain');
			res.end('client error');
		}

		if (p === '/error/404') {
			res.statusCode = 404;
			res.setHeader('Content-Encoding', 'gzip');
			res.end();
		}

		if (p === '/error/500') {
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.end('server error');
		}

		if (p === '/error/reset') {
			res.destroy();
		}

		if (p === '/error/premature') {
			res.writeHead(200, {'content-length': 50});
			res.write('foo');
			setTimeout(() => {
				res.destroy();
			}, 100);
		}

		if (p === '/error/premature/chunked') {
			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Transfer-Encoding': 'chunked'
			});

			res.write(`${JSON.stringify({data: 'hi'})}\n`);

			setTimeout(() => {
				res.write(`${JSON.stringify({data: 'bye'})}\n`);
			}, 200);

			setTimeout(() => {
				res.destroy();
			}, 400);
		}

		if (p === '/chunked/split-ending') {
			res.socket.write('HTTP/1.1 200\r\nTransfer-Encoding: chunked\r\n\r\n');
			res.socket.write('3\r\nfoo\r\n3\r\nbar\r\n');

			setTimeout(() => {
				res.socket.write('0\r\n');
			}, 10);

			setTimeout(() => {
				res.socket.end('\r\n');
			}, 20);
		}

		if (p === '/chunked/multiple-ending') {
			res.socket.write('HTTP/1.1 200\r\nTransfer-Encoding: chunked\r\n\r\n');
			res.socket.write('3\r\nfoo\r\n3\r\nbar\r\n0\r\n\r\n');
		}

		if (p === '/error/json') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end('invalid json');
		}

		if (p === '/no-content') {
			res.statusCode = 204;
			res.end();
		}

		if (p === '/no-content/gzip') {
			res.statusCode = 204;
			res.setHeader('Content-Encoding', 'gzip');
			res.end();
		}

		if (p === '/no-content/brotli') {
			res.statusCode = 204;
			res.setHeader('Content-Encoding', 'br');
			res.end();
		}

		if (p === '/not-modified') {
			res.statusCode = 304;
			res.end();
		}

		if (p === '/not-modified/gzip') {
			res.statusCode = 304;
			res.setHeader('Content-Encoding', 'gzip');
			res.end();
		}

		if (p === '/inspect') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			let body = '';
			request.on('data', c => {
				body += c;
			});
			request.on('end', () => {
				res.end(JSON.stringify({
					method: request.method,
					url: request.url,
					headers: request.headers,
					body
				}));
			});
		}

		if (p === '/multipart') {
			let body = '';
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			const bb = busboy({headers: request.headers});
			bb.on('file', async (fieldName, file, info) => {
				body += `${fieldName}=${info.filename}`;
				// consume file data
				// eslint-disable-next-line no-empty, no-unused-vars
				for await (const c of file) {}
			});
			bb.on('field', (fieldName, value) => {
				body += `${fieldName}=${value}`;
			});
			bb.on('close', () => {
				res.end(JSON.stringify({
					method: request.method,
					url: request.url,
					headers: request.headers,
					body
				}));
			});
			request.pipe(bb);
		}

		if (p === '/m%C3%B6bius') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('ok');
		}
	}
}
