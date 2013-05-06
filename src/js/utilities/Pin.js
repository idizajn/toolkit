/**
 * @copyright	Copyright 2010-2013, The Titon Project
 * @license		http://opensource.org/licenses/bsd-license.php
 * @link		http://titon.io
 */

(function() {
	'use strict';

Titon.Pin = new Class({
	Extends: Titon.Module,
	Binds: ['_resize', '_scroll'],

	/**
	 * The current window width and height.
	 */
	viewport: window.getSize(),

	/**
	 * Default options.
	 *
	 *	position	- (string) What type of positioning to use: absolute, static, fixed
	 *	location	- (string) Whether the pin should be located on the left or right of the parent
	 *	xOffset		- (int) Additional margin on the X axis
	 *	yOffset		- (int) Additional margin on the Y axis
	 *	throttle	- (int) The amount in milliseconds to update pin location
	 *	onScroll	- (function) Callback triggered when page is scrolled
	 *	onResize	- (function) Callback triggered when page is resized
	 */
	options: {
		position: 'absolute',
		location: 'right',
		xOffset: 0,
		yOffset: 0,
		throttle: 0,

		// Events
		onScroll: null,
		onResize: null
	},

	/**
	 * Pin the element and enable events.
	 *
	 * @param query
	 * @param options
	 */
	initialize: function(query, options) {
		options = options || {};
		options.templateFrom = query;
		options.template = false;

		this.parent(query, options);

		this.disable().enable();

		this.fireEvent('init');
	},

	/**
	 * Provide an empty callback to handle functionality during browser resizing.
	 * This allows pin functionality to be enabled or disabled for responsive layouts.
	 *
	 * @private
	 */
	_resize: function() {
		this.viewport = window.getSize();

		this.fireEvent('resize');
	},

	/**
	 * While the viewport is being scrolled, the element should move vertically along with it.
	 * The element should also stay contained within the parent element.
	 *
	 * @private
	 */
	_scroll: function() {
		var options = this.options,
			eSize = this.element.getCoordinates(),
			pSize = this.element.getParent().getCoordinates(),
			wScroll = window.getScroll(),
			pos = {},
			x = options.xOffset,
			y = options.yOffset;

		// Scroll reaches the top of the container
		if (wScroll.y > pSize.top) {
			y += (wScroll.y - pSize.top);
		}

		// Scroll reaches the bottom of the container
		var elementTop = wScroll.y + eSize.height,
			parentMaxHeight = pSize.height + pSize.top;

		if (elementTop >= parentMaxHeight) {
			y = options.yOffset + (pSize.height - eSize.height);
		}

		// Position the element
		pos.position = options.position;
		pos[options.location] = x;
		pos.top = y;

		this.element.setStyles(pos);

		this.fireEvent('scroll');
	},

	/**
	 * Toggle activation events on and off.
	 *
	 * @private
	 * @return {Titon.Tabs}
	 */
	_toggleEvents: function(on) {
		if (!this.query) {
			return this;
		}

		window.addEvent('resize', this._resize);

		if (on) {
			window.addEvent('scroll:throttle(' + this.options.throttle + ')', this._scroll);
		} else {
			window.removeEvent('scroll:throttle(' + this.options.throttle + ')', this._scroll);
		}

		return this;
	}.protect()

});

/**
 * All instances loaded via factory().
 */
Titon.Pin.instances = {};

/**
 * Easily create multiple instances.
 *
 * @param {String} query
 * @param {Object} options
 * @return {Titon.Pin}
 */
Titon.Pin.factory = function(query, options) {
	if (Titon.Pin.instances[query]) {
		return Titon.Pin.instances[query];
	}

	var instance = new Titon.Pin(query, options);

	Titon.Pin.instances[query] = instance;

	return instance;
};

})();