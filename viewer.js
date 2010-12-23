var express = require('express')
  , packager = require('../packager-node/packager').Packager
  , fs = require('fs')

module.exports = function(config) {
  var app = express.createServer()

  app.configure(function(){
    app.use(express.bodyDecoder());
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.staticProvider(__dirname + '/web'));
    app.use(express.compiler({src: __dirname + '/web/css', enable: ['sass']}));

    app.set('view engine', 'jade');
  });

  app.get('/', function(req, res) {
    res.render('index',
      { locals:
        { packages: packager.getPackages() }
    });
  });

  app.get('/file/:package/:file', function(req, res) {
    var package = req.params.package
      , file = req.params.file
      , authors = packager.getFileAuthors(package + '/' + file).sort();
    res.render('file',
      { locals:
        { package: package
        , file: file
        , authors: authors.sort()
        }
    });
  });

  app.get('/author/:name', function(req, res){
    var name = req.params.name
      , files = []
      , packages = []
    packager.getPackages().forEach(function(package){
			if (packager.getPackageAuthors(package).indexOf(name) != -1) packages.include(package);
      packager.getAllFiles(package).forEach(function(file) {
        if (packager.getFileAuthors(file).indexOf(name) != -1) {
          files.push(file);
          packages.include(package);
        }
      });
    });
    res.render('author',
      { locals:
        { files: files.sort()
        , packages: packages.sort()
        , name: name
        }
    });
  });

  app.get('/:package', function(req, res) {
    var package = req.params.package;
    if (!packager.packageExists(package)) res.send(404);
    var authors = packager.getPackageAuthors(package)
      , files = packager.getAllFiles(package)
    files.forEach(function(file){
      packager.getFileAuthors(file).forEach(function(author) {
        authors.include(author);
      });
    });
    res.render('package', 
      { locals:
        { authors: authors.sort()
        , files: files.sort()
				, package: package
        }
    });
  });

  app.get('/:package/download', function(req, res){
    if (packager.packageExists(req.params.package))
      packager.build(null, null, [req.params.package], null, null, function(text){
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Content-Length': text.length });
        res.end(text);
      });
    else {
      res.writeHead(404, { contentType: 'text/plain' });
      res.end(req.params.package + ' package does not exist');
    }
  });

  fs.readdir(config.pluginDir, function(err, files) {
    if (err) return console.log('error reading plugin dir on startup: ' + err);
    console.log(files)
    packager.construct(files.map(function(file){ return config.pluginDir + '/' + file }), function(){
      app.listen(config.port);
      console.log('listening on port ' + config.port);
    });
  });

}

