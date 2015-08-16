(function($) {
    var defaults = {};
    var options;

    $.fn.player = function(params){
        options = $.extend({}, defaults, options, params);
        var source;

        $(this).html('<div class="header"><span class="choose"><label class="file_upload"><span class="button">Выберите</span><input class="file" type="file"></label> или перетащите аудиофайл.</span></div><div class="playlist"></div><div class="line"></div><div class="footer"><div class="buttons"><img src="img/play.png"><img src="img/stop.png"></div></div>');

        var header = $(this).find('.header'),
            choose = $(this).find('.choose'),
            file = $(this).find('.file'),
            line = $(this).find('.line'),
            playlist = $(this).find('.playlist'),
            footer = $(this).find('.footer');

        try {
            var context = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch(err){
            console.log('Ваш браузер не поддерживает audio api');
        }

        var methods = {
            loadFile: function(e){
                var f = e.target.files[0];
                methods.initAudio(f);
            },
            buffer: function(buffer){

                if(source)
                    methods.stop();

                methods.play(buffer);
                $(choose).removeClass('loading');
                $(line).show();
                $(playlist).show();
                $(footer).show();
            },
            bufferError: function(e){
                console.log(e);
            },
            play: function(buffer) {
                source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.start(0);
            },
            stop: function(buffer) {
                source.stop();
            },
            drag: function(e){
                e.stopPropagation();
                e.preventDefault();
                $(choose).addClass('drop');
            },
            drop: function(e){
                e.stopPropagation();
                e.preventDefault();
                $(choose).removeClass('drop');
                var f = e.originalEvent.dataTransfer.files[0];
                methods.initAudio(f);

            },
            initAudio: function(f){
                var reader = new FileReader();
                reader.onload = function(e) {
                    context.decodeAudioData(e.target.result, methods.buffer, methods.bufferError);
                    methods.getTags(f);
                };
                $(choose).addClass('loading');
                reader.readAsArrayBuffer(f);
            },
            getTags: function(f){
                ID3.loadTags(
                    f.name,
                    function() {
                        $(playlist).html('');
                        var tags = ID3.getAllTags(f.name)
                        $(playlist).append('<span class="title">'+ tags.title+'</span>');
                        $(playlist).append('<span class="artist">'+ tags.artist+'</span>');
                        $(playlist).append('<span class="name">'+ f.name+'</span>');
                    },
                    {
                        tags: ["title","artist"],
                        dataReader: FileAPIReader(f)
                    });
            }
        };

        /*events*/
        $(file).change(function(e){
            methods.loadFile(e);
        });
        $(choose).on('dragover', methods.drag).on('drop', methods.drop);


        return this;
    };
})(jQuery);