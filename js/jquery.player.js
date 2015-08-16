(function($) {
    var defaults = {
        'type': 'waveform'
    };
    var options;

    $.fn.player = function(params){
        options = $.extend({}, defaults, options, params);
        var source,
            buffer,
            canvasWidth = 642,
            canvasHeight = 120,
            contextCanvas,
            startedAt,
            pausedAt,
            visual = 1,
            paused;

        var header = $('<div />', {class: "header"}).appendTo($(this)),
            choose = $('<span />', {class: "choose"}).appendTo(header),
            label = $('<label />', {class: "file_upload"}).appendTo(choose),
            btn = $('<span class="button">Выберите</span>').appendTo(label),
            file = $('<input />', {class: 'file', type: 'file'}).appendTo(label),
            txt = $(label).append(' или перетащите аудиофайл.'),
            canvas = $('<div />', {class: 'canvas'}).appendTo(header),
            playlist = $('<div />', {class: "playlist"}).appendTo($(this)),
            footer = $('<div />', {class: "footer"}).appendTo($(this)),
            buttons = $('<div />', {class: "buttons"}).appendTo(footer),
            play = $('<img />', {class: "play", src: 'img/play.png'}).appendTo(buttons),
            pause = $('<img />', {class: "pause", src: 'img/pause.png'}).appendTo(buttons),
            stop = $('<img />', {class: "stop", src: 'img/stop.png'}).appendTo(buttons);

        try {
            var context = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch(err){
            console.log('Ваш браузер не поддерживает audio api');
        }

        var analyser = context.createAnalyser();

        var methods = {
            loadFile: function(e){
                methods.initAudio(e.target.files[0]);
            },
            buffer: function(b){

                buffer = b;
                if(source)
                    methods.stop();

                methods.play();
                choose.removeClass('loading');
                canvas.show();
                playlist.show();
                footer.show();
            },
            bufferError: function(e){
                console.log(e);
                choose.removeClass('loading');
                playlist.hide();
                footer.hide();
            },
            play: function() {

                source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.connect(analyser);

                if(options.type == 'waveform')
                    methods.waveform();
                else if(options.type == 'spectrum')
                    methods.spectrum();

                paused = false;
                play.hide();
                pause.show();

                if (pausedAt) {
                    startedAt = Date.now() - pausedAt;
                    source.start(0, pausedAt / 1000);
                }
                else {
                    startedAt = Date.now();
                    source.start(0);
                }
                source.onended = function() {
                    pause.hide();
                    play.show();
                }
            },
            pause: function() {
                source.stop(0);
                pausedAt = Date.now() - startedAt;
                paused = true;
            },
            stop: function() {
                source.stop(0);
                pausedAt = 0;
                paused = true;
            },
            drag: function(e){
                e.stopPropagation();
                e.preventDefault();
                choose.addClass('drop');
            },
            drop: function(e){
                e.stopPropagation();
                e.preventDefault();
                choose.removeClass('drop');
                methods.initAudio(e.originalEvent.dataTransfer.files[0]);
            },
            initAudio: function(file){
                fileee = file;
                methods.initCanvas();

                var reader = new FileReader();
                reader.onload = function(e) {
                    context.decodeAudioData(e.target.result, methods.buffer, methods.bufferError);
                    methods.getTags(file);
                };
                choose.addClass('loading');
                reader.readAsArrayBuffer(file);
            },
            getTags: function(f){
                ID3.loadTags(
                    f.name,
                    function() {
                        playlist.html('');
                        var tags = ID3.getAllTags(f.name);
                        playlist.append('<span class="title">'+ tags.title+'</span>');
                        playlist.append('<span class="artist">'+ tags.artist+'</span>');
                        playlist.append('<span class="name">'+ f.name+'</span>');
                    },
                    {
                        tags: ["title","artist"],
                        dataReader: FileAPIReader(f)
                    });
            },
            initCanvas : function() {
                var newCanvas  = methods.createCanvas (canvasWidth, canvasHeight);
                canvas.html(newCanvas);
                contextCanvas = newCanvas.getContext('2d');
            },
            createCanvas: function ( w, h ) {
                var newCanvas = document.createElement('canvas');
                newCanvas.width  = w;
                newCanvas.height = h;
                return newCanvas;
            },
            waveform: function(){
                analyser.fftSize = 2048;
                var bufferLength = analyser.frequencyBinCount;
                var dataArray = new Uint8Array(bufferLength);
                contextCanvas.clearRect(0, 0, canvasWidth, canvasHeight);
                requestAnimationFrame(methods.waveform);
                analyser.getByteTimeDomainData(dataArray);

                contextCanvas.fillStyle = '#c6d9e3';
                contextCanvas.fillRect(0, 0, canvasWidth, canvasHeight);
                contextCanvas.lineWidth = 2;
                contextCanvas.strokeStyle = '#58B7DE';
                contextCanvas.beginPath();
                var sliceWidth = canvasWidth * 1.0 / bufferLength;
                var x = 0;
                for(var i = 0; i < bufferLength; i++) {
                    var v = dataArray[i] / 128.0;
                    var y = v * canvasHeight/2;
                    if(i === 0) {
                        contextCanvas.moveTo(x, y);
                    } else {
                        contextCanvas.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                contextCanvas.lineTo(canvasWidth, canvasHeight/2);
                contextCanvas.stroke();
            },
            spectrum: function() {
                refresh.show();
                analyser.smoothingTimeConstant = 0.3;
                analyser.fftSize = 1024;

                var javascriptNode = context.createScriptProcessor(2048, 1, 1);
                javascriptNode.connect(context.destination);

                analyser.connect(javascriptNode);

                javascriptNode.onaudioprocess = function() {
                    var array =  new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    contextCanvas.clearRect(0, 0, canvasWidth, canvasHeight);

                    contextCanvas.fillStyle = '#58B7DE';
                    for ( var i = 0; i < (array.length); i++ ){
                        var value = array[i];
                        contextCanvas.fillRect(i*5,200-value,3,200);
                    }
                };
            }
        };

        /*events*/
        file.change(function(e){
            methods.loadFile(e);
        });
        choose.on('dragover', methods.drag).on('drop', methods.drop);
        play.on('click', function () {
            methods.play();
        });
        pause.on('click', function () {
            methods.pause();
        });
        stop.on('click', function () {
            methods.stop();
        });

        return this;
    };
})(jQuery);