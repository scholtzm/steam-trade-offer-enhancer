// ==UserScript==
// @name        Steam Trade Offer Enhancer
// @namespace   localhost
// @description Browser script to enhance Steam trade offers.
// @include     /^https?:\/\/steamcommunity\.com\/(id|profiles)\/.*\/tradeoffers.*/
// @include     /^https?:\/\/steamcommunity\.com\/tradeoffer.*/
// @version     1.2.0
// @grant       none
// @author      HusKy
// ==/UserScript==

function getUrlParam(paramName) {
    var params = window.location.search.substring(1).split("&");
    for(i = 0; i < params.length; i++) {
        var currentParam = params[i].split("=");
        if(currentParam[0] === paramName) {
            return currentParam[1];
        }
    }
}

var tradeOfferPage = {
    evaluate_items: function(items) {
        var result = {};

        result._total = items.find("div.trade_item").length;

        items.find("div.trade_item").each(function() {
            var img = jQuery(this).find("img").attr("src");
            var quality = jQuery(this).css("border-top-color");

            if(result[img] === undefined)
                result[img] = {};

            if(result[img][quality] === undefined) {
                result[img][quality] = 1;
            } else {
                result[img][quality]++;
            }
        });

        return result;
    },

    dump_summary: function(tradeoffer, type, items) {
        if(items._total <= 0) return;

        var htmlstring = "Summary (" + items._total + " " + (items._total === 1 ? "item" : "items") + "):<br>";

        for(var prop in items) {
            if(prop === "_total") continue;

            var item_type = items[prop];
            for(var quality in item_type) {
                htmlstring += "<span class=\"summary_item\" style=\"background-image: url('" + prop + "'); border-color: " + quality + ";\"><span class=\"summary_badge\">" + item_type[quality] + "</span></span>";
            }
        }

        htmlstring += "<br><br>Items:<br>";
        tradeoffer.find("div." + type + " > div.tradeoffer_items_header")
                  .after("<div class=\"tradeoffer_items_summary\">" + htmlstring + "</div>");
    }
};

var tradeOfferWindow = {
    evaluate_items: function(items) {
        var result = {};
        result._total = 0;

        var slot_inner = items.find("div.slot_inner");

        slot_inner.each(function() {
            if(jQuery(this).html() !== "" && jQuery(this).html() !== null) {
                result._total++;
                var item = jQuery(this).find("div.item");

                var img = item.find("img").attr("src");
                var quality = item.css("border-top-color");

                if(result[img] === undefined)
                    result[img] = {};

                if(result[img][quality] === undefined) {
                    result[img][quality] = 1;
                } else {
                    result[img][quality]++;
                }
            }
        });

        return result;
    },

    dump_summary: function(target, type, items) {
        if(items._total <= 0) return;

        var htmlstring = type + " summary (" + items._total + " " + (items._total === 1 ? "item" : "items") + "):<br>";

        for(var prop in items) {
            if(prop === "_total") continue;

            var item_type = items[prop];
            for(var quality in item_type) {
                htmlstring += "<span class=\"summary_item\" style=\"background-image: url('" + prop + "'); border-color: " + quality + ";\"><span class=\"summary_badge\">" + item_type[quality] + "</span></span>";
            }
        }

        target.append(htmlstring);
    },

    summarise: function() {
        var target = jQuery("div.tradeoffer_items_summary");
        target.html("");

        var mine = jQuery("div#your_slots");
        var other = jQuery("div#their_slots");

        var my_items = this.evaluate_items(mine);
        var other_items = this.evaluate_items(other);

        this.dump_summary(target, "My", my_items);
        if(other_items._total > 0) target.append("<br><br>");
        this.dump_summary(target, "Their", other_items);
    },

    init: function() {
        var self = this;

        // something is loading
        var isReady = jQuery("img[src$='throbber.gif']:visible").length <= 0;

        // our partner's inventory is also loading at this point
        var itemParamExists = getUrlParam("for_item") !== undefined;
        var hasBeenLoaded = true;

        if(itemParamExists) {
            // format: for_item=<appId>_<contextId>_<itemId>
            var item = getUrlParam("for_item").split("_");
            hasBeenLoaded = jQuery("div#inventory_" + UserThem.strSteamId + "_" + item[0] + "_" + item[1]).length > 0;
        }

        if(isReady && (!itemParamExists || hasBeenLoaded)) {
            setTimeout(function() {
                self.summarise();
            }, 500);

            return;
        }

        if(itemParamExists && hasBeenLoaded) {
            setTimeout(self.deadItem.bind(self), 5000);
            return;
        }

        setTimeout(function() {
            self.init();
        }, 250);
    },

    deadItem: function() {
        var deadItemExists = jQuery("a[href$='_undefined']").length > 0;
        var item = getUrlParam("for_item").split("_");

        if(deadItemExists) {
            unsafeWindow.g_rgCurrentTradeStatus.them.assets = [];
            RefreshTradeStatus(g_rgCurrentTradeStatus, true);
            alert("Seems like the item you are looking to buy (ID: " + item[2] + ") is no longer available. You should check other users backpack and see if it's still there.");
        } else {
            // Something was loading very slowly, restart init...
            this.init();
        }
    }
};

jQuery(function() {

var location = window.location.pathname;

// Append CSS style.
var style = "<style type='text/css'>" +
            ".tradeoffer_items_summary { color: #fff; font-size: 10px; }" +
            ".summary_item { padding: 3px; margin: 0 2px 2px 0; background-color: #3C352E;background-position: center; background-size: 48px 48px; background-repeat: no-repeat; border: 1px solid; font-size: 16px; width: 48px; height: 48px; display: inline-block; }" +
            ".summary_badge { padding: 1px 3px; border-radius: 4px; background-color: #0099CC; border: 1px solid #003399; font-size: 12px; }" +
            ".btn_custom { border-width: 0; background-color: black; border-radius: 2px; font-family: Arial; color: white; line-height: 20px; font-size: 12px; padding: 0 15px; vertical-align: middle; cursor: pointer; }" +
            "</style>";
jQuery(style).appendTo("head");

// Trade offer page with multiple trade offers ...
if(location.indexOf("tradeoffers") > -1) {

    // Retrieve all trade offers.
    var trade_offers = jQuery("div.tradeoffer");

    if(trade_offers.length > 0) {
        trade_offers.each(function() {
            var others = jQuery(this).find("div.primary > div.tradeoffer_item_list");
            var mine = jQuery(this).find("div.secondary > div.tradeoffer_item_list");

            // Evaluate both sides.
            var other_items = tradeOfferPage.evaluate_items(others);
            var my_items = tradeOfferPage.evaluate_items(mine);

            // Dump the summaries somewhere ...
            tradeOfferPage.dump_summary(jQuery(this), "primary", other_items);
            tradeOfferPage.dump_summary(jQuery(this), "secondary", my_items);
        });
    }

    // Single trade offer window ...
} else if(location.indexOf("tradeoffer") > -1) {

    // Append new divs ...
    jQuery("div.trade_left div.trade_box_contents").append("<div class=\"trade_rule selectableNone\"/><div class=\"item_adder\"/>");
    jQuery("div.item_adder").append("<div class=\"selectableNone\">Add multiple items:</div>");
    jQuery("div.item_adder").append("<input id=\"amount_control\" class=\"filter_search_box\" type=\"text\" placeholder=\"16\"> ");
    jQuery("div.item_adder").append("<button id=\"btn_additems\" type=\"button\" class=\"btn_custom\">Add</button>");

    jQuery("div.trade_left div.trade_box_contents").append("<div class=\"trade_rule selectableNone\"/><div class=\"tradeoffer_items_summary\"/>");

    // Refresh summaries whenever ...
    jQuery("body").click(function() {
        setTimeout(function() { 
            tradeOfferWindow.summarise();
        }, 500);
    });

    // Handle item auto adder
    jQuery("button#btn_additems").click(function() {
        // Do not add items if the offer cannot be modified
        if(jQuery("div.modify_trade_offer:visible").length > 0) return;

        // Collect all items
        var inventory = jQuery("div.inventory_ctn:visible");
        var items = inventory.find("div.itemHolder").filter(function() {
            return jQuery(this).css("display") !== "none";
        }).find("div.item").filter(function() {
            return jQuery(this).css("display") !== "none";
        });

        // Get amount value
        var amount = parseInt(jQuery("input#amount_control").val());
        if(isNaN(amount)) amount = 16;
        if(items.length < amount) amount = items.length;

        // Add all items
        for(i = 0; i < amount; i++) {
            setTimeout(MoveItemToTrade, i * 50, items[i]);
        }

        // Refresh summaries
        setTimeout(function() {
            tradeOfferWindow.summarise();
        }, amount * 50 + 500);
    });

    tradeOfferWindow.init();

    var itemParam = getUrlParam("for_item");
    if(itemParam !== undefined) {
        var item = itemParam.split("_");

        unsafeWindow.g_rgCurrentTradeStatus.them.assets.push({
            "appid":item[0],
            "contextid":item[1],
            "assetid":item[2],
            "amount":1
        });

        RefreshTradeStatus(g_rgCurrentTradeStatus, true);
    }
}

});
