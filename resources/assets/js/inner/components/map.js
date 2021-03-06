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
            intervals: [],
            message: '',
            characterEl: null,
            shared: window.store
        };
    },
    
    filters: {
        notFound: function(items) {
            return items.filter(function(item) {
                return !item.pickedUp;
            });
        }

    },

    methods: {
        sendStatus: function() {
            if (!this.site || !this.siteLoaded || !this.characterEl) return;

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
            return ($(window).width() - 110) * percent / 100;
        },
        
        createMyCharacter: function(el, id) {
            this.characterEl = el;
        },
        
        createMapCharacter: function(el, id) {
            el.css("left", this.getLeftPos(95));
            this.site.target_info.el = el;
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
                var itemsFound = [];

                socket.emit('map_leave', this.site.id);

                this.site.items.forEach(item => {
                    if (!item.pickedUp) return;
                    itemsFound.push(item.id);
                });

                this.$http.post('/api/map', {
                    'id': this.site.id,
                    'items': itemsFound
                }).then(result => {
                    this.processSite(result.data);
                });

                this.site = null;
                this.siteLoaded = false;
                this.charXPercent = 5;
                this.characters = [];

                return;
            }

            var left = this.getLeftPos(this.charXPercent);

            this.characterEl.stop(true, true).animate({
                'left': left
            }, 50);
        },

        processSite: function(site) {
            var items = [];
            for (var x = 0; x < site.items.length; x++) {
                var key = site.items[x].type;
                if(this.shared.items.decimal[key]) {
                    var split = this.shared.items.decimal[key];
                    var count = parseInt(site.items[x].count);
                    if(count !== 0)
                        items.push({id: site.items[x].id, type: key + "/" + split[0], count: count});
                    count = Math.round(site.items[x].count * 100) % 100;
                    if(count !== 0)
                        items.push({id: site.items[x].id, type: key + "/" + split[1], count: count});
                } else {
                    items.push(site.items[x]);
                }
            }
            for (var y = 0; y < items.length; y++) {
                items[y].pickedUp = false;
            }
            site.items = items;

            site.target_info.attacked = false;
            this.site = site;
        },

        loadedSite: function() {
            this.siteLoaded = true;
        },

        getItemSrc: function(icon) {
            return '../img/surf/icons/' + icon + "." + "png";
        }
    },

    components: {
        'character': require('./character.js')
    },

    attached: function() {
        this.$http.get('/api/map').then(result => {
            this.processSite(result.data);
        });

        this.intervals.push(setInterval(this.sendStatus, 500));

        $(document).keydown(e => {
            if (!this.site || e.keyCode != 38 || !this.characterEl) return;

            var myLocationStart = this.getLeftPos(this.charXPercent) + this.characterEl.width() / 2 - 30;
            var myLocationEnd = myLocationStart + 60;
            
            var characterMapEl = $(this.site.target_info.el);
            if (!this.site.target_info.attacked && myLocationEnd > characterMapEl.offset().left && myLocationStart < characterMapEl.offset().left + characterMapEl.width()) {
                this.site.target_info.attacked = true;
                characterMapEl.animate({'opacity': 0.3}, function() {
                    characterMapEl.animate({'opacity': 1});
                });
                this.$dispatch('notification', "You attacked <span>" + this.site.target_info.name + "</span> (-5 HP)");
                var count = 0;
                var self = this;
                $("span", this.$els.items).each(function() {
                    $(this).css({"top": -80, "left": characterMapEl.offset().left + 30});
                    var left = characterMapEl.offset().left - Math.floor((Math.random() * 80) - 20);
                    self.site.items[count++].left = left;
                    $(this).animate({"top": -30, "left": left}, function() {
                        $(this).css({"top": "auto"});
                    });
                });
            }
            else if(this.site.target_info.attacked) {
                for (var x = 0; x < this.site.items.length; x++) {
                    if (myLocationEnd > this.site.items[x].left + 10 && myLocationStart < this.site.items[x].left + 15 && !this.site.items[x].pickedUp) {
                        this.site.items[x].pickedUp = true;
                        var type = this.site.items[x].type.split("/");
                        var name = this.shared.items.desc[type[0]];
                        if(type.length == 2) name = name[type[1]];
                        this.$dispatch('notification', "You have gained <span>" + name[0] + "</span> (+" + this.site.items[x].count + ")");
                        break;
                    }
                }
            }
        });

        socket.on('map_status', data => {
            if (!this.site) return;
            
            var char_array_pos = this.getCharArrayPos(data.i);
            var el = (char_array_pos > -1) ? this.characters[char_array_pos] : null;
            
            if (char_array_pos > -1 && this.characters[char_array_pos].el !== undefined) {
                var state;

                if (el.l != data.l) {
                    state = (data.l > el.l) ? "WALK_RIGHT" : "WALK_LEFT";
                    var left = this.getLeftPos(data.l);

                    var time = Math.abs(data.l - el.l) / this.walkingSpeed * 65;
                    el.state = state;

                    el.el.stop(true).animate({
                        'left': left
                    }, time, 'linear', function() {
                        state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                        el.state = state;
                    });
                } else if (el.r != data.r) {
                    state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                    el.state = state;
                }

                el.l = data.l;
                el.r = data.r;
            } else if(char_array_pos > -1) {
                el.message = '';
                el.state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
            } else {
                data.message = '';
                data.state = (data.r) ? "IDLE_RIGHT" : "IDLE_LEFT";
                this.characters.push(data);
            }
            
        });
        
        socket.on('map_leave', id => {
            if (!this.site) return;
            var char_array_pos = parseInt(this.getCharArrayPos(id));
            if (char_array_pos > -1) this.characters.splice(char_array_pos, 1);
        });

        this.$on('chat-sent', message => {
            this.message = message;

            setTimeout(() => {
                if (this.message == message) this.message = "";
            }, 5000);
        });

        this.$on('chat-received', message => {
            var char_array_pos = this.getCharArrayPos(message.id);

            if (char_array_pos == -1)
                return;

            this.characters[char_array_pos].message = message.text;

            setTimeout(function() {
                var char_array_pos = this.getCharArrayPos(message.id);

                if (char_array_pos == -1) return;

                if (this.characters[char_array_pos].message == message.text)
                    this.characters[char_array_pos].message = "";
            }, 5000);
        });
    },

    detached: function() {
        $.each(this.intervals, key => {
            clearInterval(this.intervals[key]);
        });
    }
};
