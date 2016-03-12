module.exports = {

    template: require('./map.template.html'),

    data: function() {
        return {
            charXPercent: 5,
            walkingSpeed: 0.8,
            site: null,
            siteLoaded: false,
            characters: [],
            state: 'IDLE_RIGHT',
            character: {
                name: '',
                equips: []
            },
            intervals: [],
            message: ''
        };
    },

    methods: {
        sendStatus: function() {
            if (!this.site || !this.siteLoaded) return;

            var facingRight = (this.state.indexOf('RIGHT') > -1);
            socket.emit('map_status', {
                m: this.site.id,
                l: Math.floor(this.charXPercent * 100) / 100,
                r: facingRight
            });
        },

        getCharArrayPos: function(id) {
            var keys = Object.keys(this.characters);
            var char_array_pos = -1;
            for (var x = 0; x < keys.length; x++) {
                if (id == this.characters[keys[x]].i)
                    char_array_pos = keys[x];
            }
            return char_array_pos;
        },

        getLeftPos: function(percent) {
            return ($(window).width() - $(this.$$.character).width()) * percent / 100;
        },

        createCharacter: function(el, id) {

            var char_array_pos = this.getCharArrayPos(id);
            var data = this.characters[char_array_pos];
            var left = this.getLeftPos(data.l);

            this.characters[char_array_pos].el = el;

            el.css({
                'left': left
            });
        },

        moveCharacter: function(state) {
            if (!this.site) return;

            if (state == 'WALK_LEFT') {
                this.charXPercent -= this.walkingSpeed;
            } else if (state == 'WALK_RIGHT') {
                this.charXPercent += this.walkingSpeed;
            }

            if (this.charXPercent < 0)
                this.charXPercent = 0;
            else if (this.charXPercent > 100) {
                var self = this;
                var itemsFound = [];

                socket.emit('map_leave', {
                    m: this.site.id
                });

                this.site.items.forEach(function(item) {
                    if (!item.pickedUp) return;
                    itemsFound.push(item.id);
                });

                this.$http.post('/api/map', {
                    'id': this.site.id,
                    'items': itemsFound
                }).success(function(site) {

                    self.processSite(site);
                });

                this.site = null;
                this.siteLoaded = false;
                this.charXPercent = 5;
                this.characters = [];

                return;
            }

            var left = this.getLeftPos(this.charXPercent);

            $(this.$$.character).stop(true, true).animate({
                'left': left
            }, 50);
        },

        processSite: function(site) {
            for (var x = 0; x < site.items.length; x++) {
                site.items[x].left = this.getLeftPos(Math.floor((Math.random() * 65) + 25));
                site.items[x].pickedUp = false;
            }
            
            this.site = site;
        },

        loadedSite: function() {
            this.siteLoaded = true;
        },

        openProfile: function(character) {
            this.$dispatch('open-profile', {name: character.n, id: character.i});
        },

        getItemSrc: function(icon) {
            var id = Math.floor(icon / 10);
            var str_id = "000" + id;
            str_id = str_id.substr(str_id.length - 3);
            var ext = (icon % 1000 ? 'jpg' : 'png');
            return '../img/surf/icons/' + str_id + "." + ext;
        }
    },

    components: {
        'character': require('./character.js')
    },

    filters: {
        removeFoundItems: function(items) {
            return items.filter(function(item) {
                return !item.pickedUp;
            });
        }
    },

    attached: function() {
        var self = this;

        this.character.name = window.session_name;
        this.character.equips = window.equips;

        this.$http.get('/api/map').success(function(site) {
            self.processSite(site);
        });

        this.intervals.push(setInterval(this.sendStatus, 500));

        $(document).keydown(function(e) {
            if (!self.site) return;

            if (e.keyCode != 38) return;

            var myLocationStart = self.getLeftPos(self.charXPercent) + $(self.$$.character).width() / 2 - 30;
            var myLocationEnd = myLocationStart + 60;

            for (var x = 0; x < self.site.items.length; x++) {
                if (myLocationEnd > self.site.items[x].left && myLocationStart < self.site.items[x].left + 30 && !self.site.items[x].pickedUp) {
                    self.site.items[x].pickedUp = true;
                    self.$dispatch('notification', "You have gained <span>" + self.site.items[x].name + "s</span> (+" + self.site.items[x].count + ")");
                }
            }
        });

        socket.on('map_status', function(data) {
            if (!self.site) return;
            
            var char_array_pos = self.getCharArrayPos(data.i);
            
            data.e = data.e.split(",");
            if(data.e[0] === "") data.e = [];

            if (char_array_pos > -1) {
                var oldData = self.characters[char_array_pos];
                var state;

                if (oldData.l != data.l) {
                    state = (data.l > oldData.l) ? "WALK_RIGHT" : "WALK_LEFT";
                    var left = self.getLeftPos(data.l);

                    var time = Math.abs(data.l - oldData.l) / self.walkingSpeed * 65;
                    oldData.state = state;

                    oldData.el.stop(true).animate({
                        'left': left
                    }, time, 'linear', function() {
                        state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                        oldData.state = state;
                    });
                } else if (oldData.r != data.r) {
                    state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                    oldData.state = state;
                }

                oldData.l = data.l;
                oldData.r = data.r;
            } else {
                data.message = '';
                data.state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                self.characters.push(data);
            }
        });

        socket.on('map_leave', function(id) {
            if (!self.site) return;

            var char_array_pos = self.getCharArrayPos(id);

            if (char_array_pos > -1)
                self.characters.$remove(0);

        });

        this.$on('chat-sent', function(message) {
            self.message = message;

            setTimeout(function() {
                if (self.message == message) self.message = "";
            }, 5000);
        });

        this.$on('chat-received', function(message) {
            var char_array_pos = self.getCharArrayPos(message.id);

            if (char_array_pos == -1)
                return;

            self.characters[char_array_pos].message = message.text;

            setTimeout(function() {
                var char_array_pos = self.getCharArrayPos(message.id);

                if (char_array_pos == -1)
                    return;

                if (self.characters[char_array_pos].message == message.text)
                    self.characters[char_array_pos].message = "";
            }, 5000);
        });
    },

    detached: function() {
        var self = this;

        $.each(this.intervals, function(key) {
            clearInterval(self.intervals[key]);
        });
    }
};