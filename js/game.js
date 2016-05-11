// game.js
// (c) 2016 by Milan Gruner
// Based on: https://github.com/vezwork/phasocketonline

// constants
var MAX_BUDDY_DISTANCE = 60;
var MAX_BUDDY_DISTANCED_TIME = 10;

// variables
var platforms, player, cursors;
var userscount = 0, addBuddy = 0;
var userText, login = ' ', loginText = '';
var buddys, myx, myy, myanim, socketid, buddydistancetimer;
var userhashmap = {};

// init phaser engine
var game = new Phaser.Game(800, 600, Phaser.AUTO, '',
  { preload: preload, create: create, update: update });

// init socket connection
var socket = io();

// preload assets
function preload() {
    game.load.image('sky', 'assets/sky.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
}

function create() {
    game.stage.disableVisibilityChange = true;

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.add.sprite(0,0,'sky');

    platforms = game.add.group();
    platforms.enableBody = true;

    var ground = platforms.create(0, game.world.height - 64, 'ground');
    ground.scale.setTo(2,2);
    ground.body.immovable = true;

    var ledge = platforms.create(400,400,'ground');
    ledge.body.immovable = true;
    ledge = platforms.create(-150,250,'ground');
    ledge.body.immovable = true;

    // player
    player = game.add.sprite(32, game.world.height - 150, 'dude');
    game.physics.arcade.enable(player);
    player.body.bounce.y = 0.2;
    player.body.gravity.y = 800;
    player.body.collideWorldBounds = true;
    player.animations.add('left', [0,1,2,3], 10, true);
    player.animations.add('right', [5,6,7,8], 10, true);

    // buddys represent the other connected players
    buddys = game.add.group();
    buddys.enableBody = true;

    cursors = game.input.keyboard.createCursorKeys();

    userText = game.add.text(16, 16, 'users: 1', {fontSize: '32px', fill: '#16718F'});  //displays num users online
    loginText = game.add.text(200, 16, '', {fontSize: '32px', fill: '#36718F'});      //displays user join and leave
}

/// SOCKET.IO EVENT LISTENERS ///

// receive other player's info
socket.on('userhashmap', function(msg) {
    //put the other player's info into userhashmap
    userhashmap = msg;
});

socket.on('connect', function() {
    console.log("hello " + socket.id);
    socketid = socket.id;

    // send info about your character to the server
    setInterval(function() {
        // only send data if the character has moved
        if (!(socket.id in userhashmap)) {
            socket.emit('clientinfo', [myx, myy, myanim]);
        } else if (userhashmap[socket.id][0] != myy || userhashmap[socket.id][1] != myx) {
            socket.emit('clientinfo', [myx, myy, myanim]);
        }
    }, 100);
});

function update() {
    // buddy control
    userscount = 0;

    // iterate over all connected players
    for(var user in userhashmap) {
        userscount += 1;
        var nobuddy = true; // does this user not already have a buddy
        if (user != socketid) {
            buddys.forEach(function (guy) {
                if (guy.name == user) {
                    nobuddy = false;

                    // interpolate the guy's position to the current one
                    game.physics.arcade.moveToXY(guy,userhashmap[guy.name][0],userhashmap[guy.name][1], 300, 70);
                    // is guy too far away from buddy
                    if (game.physics.arcade.distanceToXY(guy,userhashmap[guy.name][0],userhashmap[guy.name][1]) > MAX_BUDDY_DISTANCE) {
                        buddydistancetimer += 1;
                        if (buddydistancetimer > MAX_BUDDY_DISTANCED_TIME) {
                            // snaps to non-interpolated position if too far away from it
                            guy.body.position.x = userhashmap[guy.name][0];
                            guy.body.position.y = userhashmap[guy.name][1];
                        }
                    } else buddydistancetimer = 0;

                    // set the animations for the buddy
                    if (userhashmap[guy.name][2] == 'stop') {
                        guy.animations.stop();
                        guy.frame = 4;
                    } else if (userhashmap[guy.name][2] == 'jump_left') {
                        guy.animations.stop();
                        guy.frame = 3;
                    } else if (userhashmap[guy.name][2] == 'jump_right') {
                        guy.animations.stop();
                        guy.frame = 6;
                    } else {
                        guy.animations.play(userhashmap[guy.name][2]);
                    }
                }
            },this);
            if (nobuddy) {
                // create a buddy for this player
                var buddy = buddys.create(userhashmap[user][0], userhashmap[user][1], 'dude');
                buddy.tint = '0x' + (Math.round(Math.random()*Math.pow(2, 24))).toString(16);
                buddy.name = user;
                buddy.animations.add('left', [0,1,2,3], 10, true);
                buddy.animations.add('right', [5,6,7,8], 10, true);
                buddy.frame = 4;

                loginText.text = user.substr(0,5) + '.. joined';
            }
        }
    }

    //update displayed ammount of users
    userText.text = 'users: ' + userscount;

    //destroy buddies if their users left the game
    buddys.forEach(function (guy) {
        var nouser = true;
        for(var user in userhashmap) {
            // make sure buddy is not destroyed if player still exists
            if (guy.name == user) {
                nouser = false;
            }
        }

        if(nouser) {
            // destroy buddy if buddy still exists but user doesn't
            guy.destroy();
            loginText.text = guy.name.substr(0,5) + '.. left';
        }
    });


    game.physics.arcade.collide(player, platforms);
    game.physics.arcade.collide(buddys, platforms);

    player.body.velocity.x = 0;

    myx = player.x;
    myy = player.y;

    if (cursors.left.isDown) {
        // Move to the left
        player.body.velocity.x  = -150;

        player.animations.play('left');
        myanim = 'left';
    } else if (cursors.right.isDown) {
        player.body.velocity.x  = 150;

        player.animations.play('right');
        myanim = 'right';
    } else {
        player.animations.stop();

        player.frame = 4;
        myanim = 'stop';
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.body.velocity.y  = -555;
    }

    if (player.body.velocity.x > 0 && !player.body.touching.down) {
        player.animations.stop();
        player.frame = 6;
        myanim = 'jump_right';
    }

    if (player.body.velocity.x < 0 && !player.body.touching.down) {
        player.animations.stop();
        player.frame = 3;
        myanim = 'jump_left';
    }
}