define([
    'jquery',
    './component',
    '../events/clickout',
    '../extensions/shown-selector',
    '../extensions/to-string'
], function($, Toolkit) {

Toolkit.Input = Toolkit.Component.extend({
    name: 'Input',
    version: '1.4.0',

    /** The custom input element. */
    input: null,

    /** The element that wraps the custom input. */
    wrapper: null,

    /**
     * Initialize the input.
     *
     * @param {jQuery} element
     * @param {Object} [options]
     */
    constructor: function(element, options) {
        this.element = element = $(element);
        this.options = options = this.setOptions(options, element);

        if (options.checkbox) {
            element.find(options.checkbox).inputCheckbox(options);
        }

        if (options.radio) {
            element.find(options.radio).inputRadio(options);
        }

        if (options.select) {
            element.find(options.select).inputSelect(options);
        }

        this.initialize();
    },

    /**
     * Remove the wrapper before destroying.
     */
    destructor: function() {
        var options = this.options,
            element = this.element;

        if (this.name === 'Input') {
            if (options.checkbox) {
                element.find(options.checkbox).each(function() {
                    $(this).toolkit('inputCheckbox', 'destroy');
                });
            }

            if (options.radio) {
                element.find(options.radio).each(function() {
                    $(this).toolkit('inputRadio', 'destroy');
                });
            }

            if (options.select) {
                element.find(options.select).each(function() {
                    $(this).toolkit('inputSelect', 'destroy');
                });
            }

        // Check for the wrapper as some inputs may be initialized but not used.
        // Multi-selects using native controls for example.
        } else if (this.wrapper) {
            this.wrapper.replaceWith(element);
            element.removeAttr('style');
        }
    },

    /**
     * Copy classes from one element to another, but do not copy `.input` classes.
     *
     * @param {jQuery} from
     * @param {jQuery} to
     */
    copyClasses: function(from, to) {
        var classes = ($(from).attr('class') || '').replace(this.options.filterClasses, '').trim();

        if (classes) {
            $(to).addClass(classes);
        }
    },

    /**
     * Build the element to wrap custom inputs with.
     * Copy over the original class names.
     *
     * @returns {jQuery}
     */
    _buildWrapper: function() {
        var input = this.element,
            wrapper = $(this.options.template)
                .insertBefore(input)
                .append(input);

        if (this.options.copyClasses) {
            this.copyClasses(input, wrapper);
        }

        return wrapper;
    }

}, {
    copyClasses: true,
    filterClasses: /\binput\b/,
    checkbox: 'input:checkbox',
    radio: 'input:radio',
    select: 'select',
    template: '<div class="custom-input"></div>'
});

/**
 * Wraps a checkbox with a custom input.
 * Uses a label for checkbox toggling so no JavaScript events are required.
 */
Toolkit.InputCheckbox = Toolkit.Input.extend({
    name: 'InputCheckbox',
    version: '1.4.0',

    /**
     * Initialize the checkbox.
     *
     * @param {jQuery} checkbox
     * @param {Object} [options]
     */
    constructor: function(checkbox, options) {
        this.element = checkbox = $(checkbox);
        this.options = options = this.setOptions(options, checkbox);
        this.wrapper = this._buildWrapper();

        // Create custom input
        this.input = $(options.checkboxTemplate)
            .attr('for', checkbox.attr('id'))
            .insertAfter(checkbox);

        // Initialize events
        this.initialize();
    }

}, {
    checkboxTemplate: '<label class="checkbox"></label>'
});

/**
 * Wraps a radio with a custom input.
 * Uses a label for radio toggling so no JavaScript events are required.
 */
Toolkit.InputRadio = Toolkit.Input.extend({
    name: 'InputRadio',
    version: '1.4.0',

    /**
     * Initialize the radio.
     *
     * @param {jQuery} radio
     * @param {Object} [options]
     */
    constructor: function(radio, options) {
        this.element = radio = $(radio);
        this.options = options = this.setOptions(options, radio);
        this.wrapper = this._buildWrapper();

        // Create custom input
        this.input = $(options.radioTemplate)
            .attr('for', radio.attr('id'))
            .insertAfter(radio);

        // Initialize events
        this.initialize();
    }

}, {
    radioTemplate: '<label class="radio"></label>'
});

/**
 * Wraps a select dropdown with a custom input.
 * Supports native or custom dropdowns.
 */
Toolkit.InputSelect = Toolkit.Input.extend({
    name: 'InputSelect',
    version: '1.4.0',

    /** The custom drop element. */
    dropdown: null,

    /** Current option index when cycling with keyboard. */
    index: 0,

    /** Is the select a multiple choice? */
    multiple: false,

    /**
     * Initialize the select.
     *
     * @param {jQuery} select
     * @param {Object} [options]
     */
    constructor: function(select, options) {
        var events = {};

        this.element = select = $(select);
        this.options = options = this.setOptions(options, select);
        this.multiple = select.prop('multiple');

        // Multiple selects must use native controls
        if (this.multiple && options.native) {
            return;
        }

        // Wrapping element
        this.wrapper = this._buildWrapper();

        // Button element to open the drop menu
        this.input = this._buildButton();

        // Initialize events
        events['change element'] = 'onChange';

        if (!options.native) {
            events['blur element'] = 'hide';
            events['clickout dropdown'] = 'hide';
            events['click input'] = 'onToggle';

            if (!this.multiple) {
                events['keydown window'] = 'onCycle';
            }

            // Build custom dropdown when not in native
            this.dropdown = this._buildDropdown();

            // Cant hide/invisible the real select or we lose focus/blur
            // So place it below .custom-input
            this.element.css('z-index', 1);
        }

        this.events = events;

        this.initialize();

        // Trigger change immediately to update the label
        this.element.change();
    },

    /**
     * Hide the dropdown and remove active states.
     */
    hide: function() {
        if (!this.dropdown.is(':shown')) {
            return; // Vastly speeds up page time since click/out events aren't running
        }

        this.fireEvent('hiding');

        this.input.removeClass('is-active');

        this.dropdown.conceal();

        this.fireEvent('hidden');
    },

    /**
     * Show the dropdown and apply active states.
     */
    show: function() {
        this.fireEvent('showing');

        if (this.options.hideOpened) {
            $('[data-select-options]').each(function() {
                $(this).siblings('select').toolkit('inputSelect', 'hide');
            });
        }

        this.input.addClass('is-active');

        this.dropdown.reveal();

        this.fireEvent('shown');
    },

    /**
     * Build the element to represent the select button with label and arrow.
     *
     * @returns {jQuery}
     */
    _buildButton: function() {
        var options = this.options,
            button = $(options.selectTemplate)
                .find('[data-select-arrow]').html(options.arrowTemplate).end()
                .find('[data-select-label]').html(Toolkit.messages.loading).end()
                .css('min-width', this.element.width())
                .insertAfter(this.element);

        // Update the height of the native select input
        this.element.css('min-height', button.outerHeight());

        return button;
    },

    /**
     * Build the custom dropdown to hold a list of option items.
     *
     * @returns {jQuery}
     */
    _buildDropdown: function() {
        var select = this.element,
            options = this.options,
            buildOption = this._buildOption,
            dropdown = $(options.optionsTemplate).attr('role', 'listbox').aria('multiselectable', this.multiple),
            list = $('<ul/>'),
            index = 0,
            self = this;

        // Must be set for `_buildOption()`
        this.dropdown = dropdown;

        select.children().each(function() {
            var optgroup = $(this);

            if (optgroup.prop('tagName').toLowerCase() === 'optgroup') {
                if (index === 0) {
                    options.hideFirst = false;
                }

                list.append(
                    $(options.headingTemplate).text(optgroup.attr('label'))
                );

                optgroup.children().each(function() {
                    var option = $(this);

                    if (optgroup.prop('disabled')) {
                        option.prop('disabled', true);
                    }

                    if (option.prop('selected')) {
                        self.index = index;
                    }

                    list.append( buildOption(option, index) );
                    index++;
                });
            } else {
                if (optgroup.prop('selected')) {
                    self.index = index;
                }

                list.append( buildOption(optgroup, index) );
                index++;
            }
        });

        if (options.hideSelected && !options.multiple) {
            dropdown.addClass('hide-selected');
        }

        if (options.hideFirst) {
            dropdown.addClass('hide-first');
        }

        if (this.multiple) {
            dropdown.addClass('is-multiple');
        }

        this.wrapper.append(dropdown.append(list));

        return dropdown;
    },

    /**
     * Build the list item to represent the select option.
     *
     * @param {jQuery} option
     * @param {Number} index
     * @returns {jQuery}
     */
    _buildOption: function(option, index) {
        var select = this.element,
            dropdown = this.dropdown,
            options = this.options,
            selected = option.prop('selected'),
            activeClass = 'is-active';

        // Create elements
        var li = $('<li/>'),
            content = option.text(),
            description;

        if (selected) {
            li.addClass(activeClass);
        }

        if (description = this.readValue(option, options.getDescription)) {
            content += $(options.descTemplate).html(description).toString();
        }

        var a = $('<a/>', {
            html: content,
            href: 'javascript:;',
            role: 'option'
        }).aria('selected', selected);

        if (this.options.copyClasses) {
            this.copyClasses(option, li);
        }

        li.append(a);

        // Attach no events for disabled options
        if (option.prop('disabled')) {
            li.addClass('is-disabled');
            a.aria('disabled', true);

            return li;
        }

        // Set events
        if (this.multiple) {
            a.click(function() {
                var self = $(this),
                    selected = false;

                if (option.prop('selected')) {
                    self.parent().removeClass(activeClass);

                } else {
                    selected = true;
                    self.parent().addClass(activeClass);
                }

                option.prop('selected', selected);
                self.aria('selected', selected);

                select.change();
            });

        } else {
            var self = this;

            a.click(function() {
                dropdown
                    .find('li').removeClass(activeClass).end()
                    .find('a').aria('selected', false);

                $(this)
                    .aria('selected', true)
                    .parent()
                        .addClass(activeClass);

                self.hide();
                self.index = index;

                select.val(option.val());
                select.change();
            });
        }

        return li;
    },

    /**
     * Loop through the options and determine the index to
     * Skip over missing options, disabled options, or hidden options.
     *
     * @private
     * @param {Number} index
     * @param {Number} step
     * @param {jQuery} options
     * @returns {Number}
     */
    _loop: function(index, step, options) {
        var hideFirst = this.options.hideFirst;

        index += step;

        while ((typeof options[index] === 'undefined') || options[index].disabled || (index === 0 && hideFirst)) {
            index += step;

            if (index >= options.length) {
                index = 0;
            } else if (index < 0) {
                index = options.length - 1;
            }
        }

        return index;
    },

    /**
     * Event handler for select option changing.
     *
     * @private
     * @param {jQuery.Event} e
     */
    onChange: function(e) {
        var select = $(e.target),
            options = select.find('option'),
            opts = this.options,
            selected = [],
            label = [],
            self = this;

        // Fetch label from selected option
        options.each(function() {
            if (this.selected) {
                selected.push( this );
                label.push( self.readValue(this, opts.getOptionLabel) || this.textContent );
            }
        });

        // Reformat label if needed
        if (this.multiple) {
            var title = this.readValue(select, opts.getDefaultLabel),
                format = opts.multipleFormat,
                count = label.length;

            // Use default title if nothing selected
            if (!label.length && title) {
                label = title;

            // Display a counter for label
            } else if (format === 'count') {
                label = opts.countMessage
                    .replace('{count}', count)
                    .replace('{total}', options.length);

            // Display options as a list for label
            } else if (format === 'list') {
                var limit = opts.listLimit;

                label = label.splice(0, limit).join(', ');

                if (limit < count) {
                    label += ' ...';
                }
            }
        } else {
            label = label.join(', ');
        }

        // Set the label
        select.parent()
            .find('[data-select-label]')
                .text(label);

        this.fireEvent('change', [select.val(), selected]);
    },

    /**
     * Event handler for cycling through options with up and down keys.
     *
     * @private
     * @param {jQuery.Event} e
     */
    onCycle: function(e) {
        if (!this.dropdown.is(':shown')) {
            return;
        }

        if ($.inArray(e.keyCode, [38, 40, 13, 27]) >= 0) {
            e.preventDefault();
        } else {
            return;
        }

        var options = this.element.find('option'),
            items = this.dropdown.find('a'),
            activeClass = 'is-active',
            index = this.index;

        switch (e.keyCode) {
            case 13: // enter
            case 27: // esc
                this.hide();
            return;
            case 38: // up
                index = this._loop(index, -1, options);
            break;
            case 40: // down
                index = this._loop(index, 1, options);
            break;
        }

        options.prop('selected', false);
        options[index].selected = true;

        items.parent().removeClass(activeClass);
        items.eq(index).parent().addClass(activeClass);

        this.index = index;
        this.element.change();
    },

    /**
     * Event handler for toggling custom dropdown display.
     *
     * @private
     */
    onToggle: function() {
        if (this.element.prop('disabled')) {
            return;
        }

        if (this.dropdown.is(':shown')) {
            this.hide();
        } else {
            this.show();
        }
    }

}, {
    native: Toolkit.isTouch,
    multipleFormat: 'count', // count, list
    countMessage: '{count} of {total} selected',
    listLimit: 3,
    hideOpened: true,
    hideFirst: false,
    hideSelected: false,
    getDefaultLabel: 'title',
    getOptionLabel: 'title',
    getDescription: 'data-description',
    selectTemplate: '<div class="select" data-select>' +
        '<div class="select-arrow" data-select-arrow></div>' +
        '<div class="select-label" data-select-label></div>' +
    '</div>',
    arrowTemplate: '<span class="caret-down"></span>',
    optionsTemplate: '<div class="drop drop--down select-options" data-select-options></div>',
    headingTemplate: '<li class="drop-heading"></li>',
    descTemplate: '<span class="drop-desc"></span>'
});

Toolkit.create('input', function(options) {
    return new Toolkit.Input(this, options);
});

Toolkit.create('inputRadio', function(options) {
    return new Toolkit.InputRadio(this, options);
});

Toolkit.create('inputCheckbox', function(options) {
    return new Toolkit.InputCheckbox(this, options);
});

Toolkit.create('inputSelect', function(options) {
    return new Toolkit.InputSelect(this, options);
});

return Toolkit;
});