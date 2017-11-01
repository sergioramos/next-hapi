const Inert = require('inert');
const Next = require('next');

const pkg = require('../package.json');
const renderError = require('./render-error');
const renderScript = require('./render-script');
const renderHtml = require('./render-html');
const routes = require('./routes');

exports.plugin = {
  pkg,
  multiple: false,
  once: true,
  register: async (server, options) => {
    // init and expose next
    server.expose('next', Next(options));
    await server.plugins[pkg.name].next.prepare();

    // setup static server
    await server.register(Inert);

    // register render methods
    server.decorate('toolkit', 'render', renderHtml);
    server.decorate('toolkit', 'hapi_next_renderError', renderError);
    server.decorate('toolkit', 'hapi_next_renderScript', renderScript);

    // register routes
    routes.forEach(({ path, handler }) =>
      server.route({
        method: 'GET',
        path,
        handler
      })
    );
  }
};
