(function ($) {

  $.widget('rf.orderingList', {

    options: {
      disabled: false,
      header: undefined,
      height: undefined,
      heightMin: undefined,
      heightMax: undefined,
      styleClass: undefined,
      columnClasses: undefined,
      showButtons: true,
      buttonsText: undefined, // {first: ..., up: ..., down: ..., last: ...}
      contained: true,
      dragSelect: false,
      dropOnEmpty: true,
      mouseOrderable: true,
      widgetEventPrefix: 'orderinglist_',

      // callbacks
      change: null,
      addDomElements: null,
      destroy: null,
      focus: null,
      blur: null,
      change: null
    },

    _create: function () {
      var widget = this;
      this.selectableOptions = {
        disabled: widget.options.disabled
      };
      this.sortableOptions = { handle: this.options.dragSelect ? ".handle" : false,
        disabled: this.options.disabled,
        dropOnEmpty: this.options.dropOnEmpty,
        scroll: true,
        placeholder: "placeholder",
        tolerance: "pointer",
        start: function (event, ui) {
          widget.currentItems = ui.item.parent().children('.ui-selected').not('.placeholder').not('.helper-item');
          var helper = ui.helper;
          var placeholder = widget.element.find('.placeholder');
          placeholder.css('height', helper.css('height'));

          widget.currentItems.not(ui.item).hide();
        },
        sort: function (event, ui) {
          var $widget = $(this);
          var helperTop = ui.helper.position().top,
            helperBottom = helperTop + ui.helper.outerHeight();
          $widget.children('.ui-selectee').not('.placeholder').not('.helper-item').not('.ui-selected').each(function () {
            var item = $(this);
            var itemTop = item.position().top;
            var itemMiddle = item.position().top + item.outerHeight() / 2;
            /* if the helper overlaps half of an item, move the placeholder */
            if (helperTop < itemMiddle && itemMiddle < helperBottom) {
              if (itemTop > helperTop) {
                $('.placeholder', $widget).insertAfter(item);
              } else {
                $('.placeholder', $widget).insertBefore(item);
              }
              return false;
            }
          });
        },
        cancel: function (event, ui) {
          widget.currentItems.show();
        },
        over: function (event, ui) {
          if (widget.fillItem) {
            widget._updateFillRow()
          }
        },
        beforeStop: function (event, ui) {
        },
        stop: function (event, ui) {
          var first = widget.currentItems.first();
          if (first.get(0) !== ui.item.get(0)) {
            ui.item.before(first);
            first.after(widget.currentItems.not(first).detach());
          } else {
            ui.item.after(widget.currentItems.not(ui.item).detach());
          }
          widget.currentItems.not('.placeholder').show();
          var ui = widget._dumpState();
          ui.movement = 'drag';
          if (widget.fillItem) {
            widget._updateFillRow()
          }
          widget._trigger("change", event, ui);
        }
      };
      if (this.element.is("table")) {
        this.strategy = "table";
        this.$pluginRoot = this.element.find("tbody");
        this.sortableOptions.items = "tr:not(.fill-item)";
        this.selectableOptions.filter = "tr:not(.fill-item)";
        this.sortableOptions.helper = $.proxy(this._rowHelper, this);
      } else {
        this.strategy = "list";
        this.$pluginRoot = this.element;
        this.selectableOptions.filter = "li";
        this.sortableOptions.helper = $.proxy(this._listHelper, this);
      }
      if (this.options.contained !== false) {
        this.sortableOptions.containment = this.$pluginRoot;
        this.sortableOptions.axis = "y";
      }
      // if mouse ordering is disabled buttons have to be shown
      this._addDomElements();
      this.widgetEventPrefix = this.options.widgetEventPrefix;
      if (this.options.mouseOrderable === true) {
        this.$pluginRoot.sortable(this.sortableOptions);
      }

      this.$pluginRoot.selectable(this.selectableOptions);
      if (this.options.disabled === true) {
        widget._disable();
      }
      var selector = '.handle';
      this._addDragListeners();
      this.selectList.on('focusin', function (event) {
        widget._trigger('focus', event, widget._dumpState());
      });
      this.selectList.on('focusout', function (event) {
        widget._trigger('blur', event, widget._dumpState());
      });
      if (typeof this.options.height !== 'undefined') {
        this._setHeight(this.options.height);
      }
      if (typeof this.options.heightMin !== 'undefined') {
        this._setHeightMin(this.options.height);
      }
      if (typeof this.options.heightMax !== 'undefined') {
        this._setHeightMax(this.options.height);
      }
      this._trigger('create', undefined, this._dumpState());
    },

    destroy: function () {
      $.Widget.prototype.destroy.call(this);
      this.$pluginRoot
        .sortable("destroy")
        .selectable("destroy");
      this._removeDomElements();

      // remove empty class attributes                             y
      if (!this.element.attr('class')) {
        this.element.removeAttr("class");
      }
      if (this.strategy === 'table') {
        this.element.children().each(function () {
          var $part = $(this);
          if (!$part.attr('class')) {
            $part.removeAttr("class");
          }
          $part.children().each(function () {
            var $row = $(this);
            if (!$row.attr('class')) {
              $row.removeAttr("class");
            }
            $row.children().each(function () {
              var $cell = $(this);
              if (!$cell.attr('class')) {
                $cell.removeAttr("class");
              }
            });
          });
        });
      } else {
        this.element.children().each(function () {
          var $selectable = $(this);
          if (!$selectable.attr('class')) {
            $selectable.removeAttr("class");
          }
        });
      }
      this._trigger('destroy', undefined, {});
    },

    _addDragListeners: function() {
      var widget = this;
      if (this.options.dragSelect == false) {
        this.element.on("mousedown", '.ui-selectee', function (event) {
          var item = $(this);
          if (widget.selectList.get(0) !== document.activeElement) {
            widget.selectList.focus();
          }
          var list = item.parents('.list').first();
          list.data('rfOrderingList').mouseStarted = true;
        });
        this.$pluginRoot.on("mousemove", '.ui-selectee', function (event) {
          var item = $(this);
          var list = item.parents('.list').first();
          var orderingList = list.data('rfOrderingList');
          if (orderingList.mouseStarted) {
            orderingList.mouseStarted = false;
            if (!item.hasClass('ui-selected')) {
              var selectable = orderingList.$pluginRoot.data('uiSelectable');
              selectable._mouseStart(event);
              selectable._mouseStop(event);
            }
          }
        });
        this.element.on("mouseup", '.ui-selectee', function (event) {
          var item = $(this);
          var list = item.parents('.list').first();
          var orderingList = list.data('rfOrderingList');
          if (orderingList.mouseStarted) {
            orderingList.mouseStarted = false;
            var selectable = orderingList.$pluginRoot.data('uiSelectable');
            selectable._mouseStart(event);
            selectable._mouseStop(event);
          }
        });
      } else {
        this.element.find('.handle').on("mousedown", function (event) {
          var item = $(this).parents('.ui-selectee').first();
          if (!item.hasClass('ui-selected')) {
            var list = item.parents('.list').first();
            var selectable = list.data('rfOrderingList').$pluginRoot.data('uiSelectable');
            selectable._mouseStart(event);
            selectable._mouseStop(event);
          }
        });
      }
    },

    _removeDragListeners: function() {
      if (this.options.dragSelect == false) {
        this.element.off("mousedown", '.ui-selectee');
        this.element.off("mousemove", '.ui-selectee');
        this.element.off("mouseup", '.ui-selectee');
      } else {
        this.element.find('.handle').off("mousedown");
      }
    },

    _listHelper: function (e, item) {
      var $helper = $("<ol />").addClass('helper')
        .css('height', 'auto').css('width', this.element.css('width'));
      item.parent().children('.ui-selected').not('.ui-sortable-placeholder').clone().addClass("helper-item").show().appendTo($helper);
      return $helper;
    },

    _rowHelper: function (e, item) {
      var $helper = $("<div />").addClass('helper').css('height', 'auto');
      item.parent().children('.ui-selected').not('.ui-sortable-placeholder').clone().addClass("helper-item").show().appendTo($helper);
      /* we lose the cell width in the clone, so we re-set it here: */
      var firstRow = $helper.children("tr").first();
      /* we only need to set the column widths on the first row */
      firstRow.children().each(function (colindex) {
        var originalCell = item.children().get(colindex);
        var originalWidth = $(originalCell).css('width');
        $(this).css('width', originalWidth);
      });
      return $helper;
    },

    _setOption: function (key, value) {
      var widget = this;
      if (this.options.key === value) {
        return;
      }
      switch (key) {
        case "disabled":
          if (value === true) {
            widget._disable();
          } else {
            widget._enable();
          }
          break;
        case "header":
          if (!widget.header) {
            widget._addHeader();
          }
          widget.header.text(value);
          break;
        case "height":
          widget._setHeight(value);
          break;
        case "heightMin":
          widget._setHeightMin(value);
          break;
        case "heightMax":
          widget._setHeightMax(value);
          break;
        case "columnClasses":
          if (widget.options.columnClasses) {
            widget._removeColumnClasses(widget.options.columnClasses);
          }
          widget._addColumnClasses(value);
          break;
        case "styleClass":
          if (widget.options.styleClass) {
            widget.selectList.removeClass(this.options.styleClass);
          }
          widget.selectList.addClass(value);
          break;
        case "buttonsText":
          this._applyButtonsText(this.selectList.find('.btn-group-vertical'), value);
          break;
      }
      $.Widget.prototype._setOption.apply(widget, arguments);
    },

    _createKeyArray: function (items) {
      var keys = new Array();
      items.each(function () {
        var $this = $(this);
        var dataKey = $this.data('key');
        var key = (dataKey) ? dataKey : $this.text();
        keys.push(key);
      })
      return keys;
    },

    /** Public API methods **/

    connectWith: function (target) {
      var targetOrderingList = target.data("rfOrderingList");
      this.$pluginRoot.sortable("option", "connectWith", targetOrderingList.$pluginRoot);
      this._addFillRow();
      target.on("sortover", $.proxy(this._updateFillRow, this));  // own "out" event causes placeholder interference
    },

    isSelected: function (item) {
      return $(item).hasClass('ui-selected');
    },

    getSelected: function() {
      return this.element.find('.ui-selected');
    },

    selectItem: function (item) {
      $(item).addClass('ui-selected');
    },

    unSelectItem: function (item) {
      $(item).removeClass('ui-selected');
    },

    unSelectAll: function () {
      var widget = this;
      this._removeDomElements();
      this.element.children().each(function () {
        widget.unSelectItem(this);
      });
    },

    moveTop: function (items, event) {
      if (this.options.disabled) return;
      var first = items.prevAll().not('.ui-selected').last();
      $(items).insertBefore(first);
      var ui = this._dumpState();
      ui.movement = 'moveTop';
      this._trigger("change", event, ui);
    },

    moveUp: function (items, event) {
      if (this.options.disabled) return;
      $(items).each(function () {
        var $item = $(this);
        var prev = $item.prevAll().not('.ui-selected').first();
        if (prev.length > 0) {
          $item.insertBefore(prev);
        }
      });
      var ui = this._dumpState();
      ui.movement = 'moveUp';
      this._trigger("change", event, ui);
    },

    moveDown: function (items, event) {
      if (this.options.disabled) return;
      $(items).sort(function () {
        return 1
      }).each(function () {
        var $item = $(this);
        var next = $item.nextAll().not('.ui-selected').first();
        if (next.length > 0) {
          $item.insertAfter(next);
        }
      });
      var ui = this._dumpState();
      ui.movement = 'moveDown';
      this._trigger("change", event, ui);
    },

    moveLast: function (items, event) {
      if (this.options.disabled) return;
      var last = items.nextAll().not('.ui-selected').last();
      $(items).insertAfter(last);
      var ui = this._dumpState();
      ui.movement = 'moveLast';
      this._trigger("change", event, ui);
    },

    remove: function (items) {
      items.detach();
      var ui = this._dumpState();
      ui.movement = 'remove';
      this._trigger("change", event, ui);
      return items;
    },

    add: function (items) {
      this.$pluginRoot.prepend(items);
      var ui = this._dumpState();
      ui.movement = 'add';
      this._trigger("change", event, ui);
      return items;
    },

    getOrderedElements: function () {
      return this.element.find('.ui-selectee');
    },

    getOrderedKeys: function () {
      return (this._createKeyArray( this.getOrderedElements()));
    },

    /** Initialisation methods **/

    _addDomElements: function () {
      this._addParents();
      this._addMouseHandles();
      if (this.options.showButtons === true) {
        this._addButtons();
      }
      if (this.strategy === 'table') { /* round the table row corners */
        var widget = this;
        this.element.find("tr").each(function () {
            var $tr = $(this);
            var children = $tr.children();
            children.last().addClass('last');
            children.first().addClass('first');
            if (widget.options.columnClasses) {
              widget._addColumnClassesToCells(children, widget.options.columnClasses);
            }
          })
      }
      this._trigger('addDomElements', undefined, this._dumpState());
    },

    _addColumnClasses: function(columnClasses) {
      if (this.strategy !== 'table') {
        return;
      }
      var widget = this;
      this.element.find('tr').each(function () {
          widget._addColumnClassesToCells($(this).children(), columnClasses);
        });
    },

    _addColumnClassesToCells: function(cells, columnClasses) {
      var columnClasses = columnClasses.split(" ");
      cells.each(function(count) {
        if (count < columnClasses.length) {
          $(this).addClass(columnClasses[count]);
        } else {
          return false;
        }
      });
    },

    _addButtons: function () {
      var buttonStack = $("<div/>")
        .addClass("btn-group-vertical");
      this._addButton(buttonStack, "first", 'icon-arrow-up', $.proxy(this._firstHandler, this));
      this._addButton(buttonStack, "up", 'icon-arrow-up', $.proxy(this._upHandler, this));
      this._addButton(buttonStack, "down", 'icon-arrow-down', $.proxy(this._downHandler, this));
      this._addButton(buttonStack, "last", 'icon-arrow-down', $.proxy(this._lastHandler, this));
      if (this.options.buttonsText) {
        this._applyButtonsText(buttonStack, this.options.buttonsText);
      }
      this.content.append(
        $('<div />').addClass('button-column').append(buttonStack));
    },

    _applyButtonsText: function(buttonStack, buttonsText) {
      this._applyButtonText(buttonStack.find('.btn-first'), buttonsText.first);
      this._applyButtonText(buttonStack.find('.btn-up'), buttonsText.up);
      this._applyButtonText(buttonStack.find('.btn-down'), buttonsText.down);
      this._applyButtonText(buttonStack.find('.btn-last'), buttonsText.last);
    },

    _applyButtonText: function(button, text) {
      if (!text) {
        if (button.hasClass('labeled')) {
          button.removeClass('labeled');
          button.find('span').remove();
        }
        return;
      }
      if (button.hasClass('labeled')) {
        button.find('span').text(text);
      } else {
        button.addClass("labeled").append($("<span />").text(text));
      }
    },

    _addButton: function (buttonStack, buttonClass, icon, handler) {
      var button = $("<button/>")
        .attr('type', 'button')
        .addClass("btn btn-default")
        .addClass('btn-' + buttonClass)
        .on('click.orderingList', handler)
        .append($("<i />").addClass('icon icon-' + buttonClass));
      buttonStack.append(button);
    },

    _addMouseHandles: function () {
      if (this.options.mouseOrderable !== true) {
        return
      }
      if (this.options.dragSelect === true) {
        this.content.addClass('with-handle');
        if (this.strategy === 'table') {
          this.element
            .find("tbody > tr")
            .prepend("<th class='handle'><i class='icon-move'></i></th>");
          this.element
            .find("thead > tr")
            .prepend("<th class='handle'></th>");
        } else if (this.strategy === 'list') {
          this.element
            .find("li")
            .prepend("<div class='handle'><i class='icon-move'></i></div>");
        }
      }
    },

    _addParents: function () {
      this.element.addClass('list').wrap(
        $("<div />").addClass('ordering-list select-list').attr('tabindex', -1).append(
          $('<div />').addClass('content').append(
            $('<div />').addClass('scroll-box')
          )
        )
      );
      this.selectList = this.element.parents(".select-list").first();
      if (this.options.styleClass) {
        this.selectList.addClass(this.options.styleClass);
      }
      if (this.options.header) {
        this._addHeader();
      }
      this.content = this.selectList.find(".content");
    },

    _addHeader: function() {
      var header = $("<div />").addClass('header');
      header.html(this.options.header);
      this.selectList.prepend(header);
      this.header = header;
    },

    _addFillRow: function() {
      var connectedList = this.$pluginRoot.sortable( "option", "connectWith" );
      if (!connectedList || this.strategy != "table") {
        return;
      }

      var itemsSelector = this.$pluginRoot.sortable( "option", "items" );
      var children = this.$pluginRoot.find(itemsSelector);

      if (children.length > 0) {
        var child = children.first();
      } else {
        var connectedChildren = $(connectedList).find("tr");
        if (connectedChildren.length > 0) {
          child = connectedChildren.first();
        }
      }
      if (child) {
        var fillItem = child.clone();
        fillItem.removeClass().addClass('fill-item').removeClass('ui-selectee');
        fillItem.find('td').empty();
        fillItem.data("key", undefined);
        this.$pluginRoot.append(fillItem);
        this.fillItem = fillItem;
        this.element.on(this.options.widgetEventPrefix + 'change', $.proxy(this._updateFillRow, this));
      }
      this._updateFillRow();
    },

    _updateFillRow: function() {
      if (this.fillItem) {
        this.fillItem.css('height', '0');
        var table = this.fillItem.parents('table').first();
        var tbody = this.fillItem.parents('tbody').first();
        var scrollBox = this.fillItem.parents('.scroll-box').first();
        this.fillItem.detach();
        var height = scrollBox.height() - table.height();
        var placeholder = this.element.find('.placeholder');
        if (placeholder) {
          height = height - placeholder.height();
        }
        this.fillItem.height(height);
        this.fillItem.toggle((height > 2));
        tbody.append(this.fillItem);
      }
    },

    _setHeight: function(height) {
      this.selectList.find('.scroll-box').css('height', height);
    },

    _setHeightMin: function(height) {
      this.selectList.find('.scroll-box').css('min-height', height);
    },

    _setHeightMax: function(height) {
      this.selectList.find('.scroll-box').css('max-height', height);
    },

    _disable: function () {
      this.$pluginRoot
        .sortable("option", "disabled", true)
        .selectable("option", "disabled", true);
      this.element
        .addClass("disabled")
        .find(".ui-selected").removeClass('ui-selected');
      this.element.find(".ui-selectee").removeClass("ui-selectee").addClass("ui-disabled");
      $('.button-column', this.content).find("button").attr("disabled", true);
      this._removeDragListeners();
    },

    _enable: function () {
      this.$pluginRoot
        .sortable("option", "disabled", false)
        .selectable("option", "disabled", false);
      this.element.removeClass("disabled");
      this.element.find(".ui-disabled").removeClass("ui-disabled").addClass("ui-selectee");
      $('.button-column', this.content).find("button").attr("disabled", false);
      this._addDragListeners();
    },

    _dumpState: function () {
      var ui = {};
      ui.orderedElements = this.getOrderedElements();
      ui.orderedKeys = this.getOrderedKeys();
      return ui;
    },

    /** Cleanup methods **/

    _removeDomElements: function () {
      this.element.find('.ui-selected').removeClass('ui-selected');
      if (this.strategy === 'table') { /* round the table row corners */
        var widget = this;
        this.element.find("tr").each(function () {
            var $tr = $(this);
            var children = $tr.children();
            children.last().removeClass('last');
            children.first().removeClass('first');
            if (widget.options.columnClasses) {
              widget._removeColumnClassesFromCells(children, widget.options.columnClasses);
            }
          });
        if (this.fillItem) {
          this.element.find('.fill-item').remove();
        }

      }
      var list = this.element.detach();
      this.selectList.replaceWith(list);
      if (this.options.dragSelect === true) {
        this.content.removeClass('with-handle');
        this.element.find('.handle').remove();
      }
      this.element.removeClass('list');
    },

    _removeColumnClasses: function(columnClasses) {
      if (this.strategy !== 'table') {
        return;
      }
      var widget = this;
      this.element.find('tr').each(function() {
        widget._removeColumnClassesFromCells($(this).children(), columnClasses);
      });
    },

    _removeColumnClassesFromCells: function(cells, columnClasses) {
      var columnClasses = columnClasses.split(" ");
      cells.each(function(count) {
        if (count < columnClasses.length) {
          $(this).removeClass(columnClasses[count]);
        } else {
          return false;
        }
      });
    },

    /** Event Handlers **/

    _firstHandler: function (event) {
      this.moveTop($('.ui-selected', this.element), event);
    },

    _upHandler: function (event) {
      this.moveUp($('.ui-selected', this.element), event);
    },

    _downHandler: function (event) {
      this.moveDown($('.ui-selected', this.element), event);
    },

    _lastHandler: function (event) {
      this.moveLast($('.ui-selected', this.element), event);
    }

  });

}(jQuery));