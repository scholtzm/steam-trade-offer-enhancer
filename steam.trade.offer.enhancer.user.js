// ==UserScript==
// @name        Steam Trade Offer Enhancer
// @namespace   http://steamcommunity.com/id/H_s_K/
// @description Browser script to enhance Steam trade offers.
// @include     /^https?:\/\/steamcommunity\.com\/(id|profiles)\/.*\/tradeoffers.*/
// @include     /^https?:\/\/steamcommunity\.com\/tradeoffer.*/
// @version     1.3.2
// @author      HusKy
// ==/UserScript==

function getUrlParam(paramName) {
    var params = window.location.search.split(/\?|\&/);
    for(i = 0; i < params.length; i++) {
        var currentParam = params[i].split("=");
        if(currentParam[0] === paramName) {
            return currentParam[1];
        }
    }
}

// array of dangerous descriptions
var dangerous_descriptions = [
    {
        tag: "uncraftable",
        description: "Not Usable in Crafting"
    },
    {
        tag: "gifted",
        description: "Gift from:"
    }
];

// array of rare TF2 keys (defindexes)
var rare_TF2_keys = [
    "5049", "5067", "5072", "5073",
    "5079", "5081", "5628", "5631",
    "5632", "5713", "5716", "5717",
    "5762"
];

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
    },

    attach_links: function(tradeoffer) {
        var avatar = tradeoffer.find("a.tradeoffer_avatar");

        if(avatar.length > 0) {
            var profileUrl = avatar.attr("href").match(/^https?:\/\/steamcommunity\.com\/(id|profiles)\/(.*)/);
            if(profileUrl) {
                jQuery("div.tradeoffer_footer_actions").append(" | <a class='whiteLink' target='_blank' href='http://rep.tf/" + profileUrl[2] + "'>rep.tf</a>");
            }
        }
    }
};

var tradeOfferWindow = {
    evaluate_items: function(items) {
        var result = {};
        result._total = 0;
        result._warnings = [];

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

                // let's check item's info
                var appid = item[0].id.split("_")[0].replace("item", "");
                var contextid = item[0].id.split("_")[1];
                var assetid = item[0].id.split("_")[2];

                var inventory_item;
                if(items[0].id === "your_slots")
                    inventory_item = unsafeWindow.g_rgAppContextData[appid].rgContexts[contextid]
                        .inventory.rgInventory[assetid];
                else
                    inventory_item = unsafeWindow.g_rgPartnerAppContextData[appid].rgContexts[contextid]
                        .inventory.rgInventory[assetid];

                var descriptions = inventory_item.descriptions;
                var appdata = inventory_item.app_data;
                var fraudwarnings = inventory_item.fraudwarnings;

                var warning_text;

                if(typeof descriptions === "object") {
                    descriptions.forEach(function(d1) {
                        dangerous_descriptions.forEach(function(d2) {
                            if(d1.value.indexOf(d2.description) > -1) {
                                var warning_text = "Offer contains " + d2.tag + " item(s).";
                                if(result._warnings.indexOf(warning_text) === -1)
                                    result._warnings.push(warning_text);
                            }
                        });
                    });
                }

                if(typeof appdata === "object" && typeof appdata.def_index === "string") {
                    if(rare_TF2_keys.indexOf(appdata.def_index) > -1) {
                        warning_text = "Offer contains rare TF2 key(s).";
                        if(result._warnings.indexOf(warning_text) === -1)
                            result._warnings.push(warning_text);
                    }
                }

                if(typeof fraudwarnings === "object") {
                    fraudwarnings.forEach(function(text) {
                        if(text.indexOf("restricted gift") > -1) {
                            warning_text = "Offer contains restricted gift(s).";
                            if(result._warnings.indexOf(warning_text) === -1)
                                result._warnings.push(warning_text);
                        }
                    });
                }

            }
        });

        return result;
    },

    dump_summary: function(target, type, items) {
        if(items._total <= 0) return;

        var htmlstring = type + " summary (" + items._total + " " + (items._total === 1 ? "item" : "items") + "):<br>";

        // item counts
        for(var prop in items) {
            if(prop.indexOf("_") === 0) continue;

            var item_type = items[prop];
            for(var quality in item_type) {
                htmlstring += "<span class=\"summary_item\" style=\"background-image: url('" + prop + "'); border-color: " + quality + ";\"><span class=\"summary_badge\">" + item_type[quality] + "</span></span>";
            }
        }

        // warnings
        if(items._warnings.length > 0) {
            htmlstring += "<span class=\"warning\"><br>Warning:<br>";
            items._warnings.forEach(function(warning, index) {
                htmlstring += warning;

                if(index < items._warnings.length - 1) {
                    htmlstring += "<br>";
                }
            });
            htmlstring += "</span>";
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
            alert("Seems like the item you are looking to buy (ID: " + item[2] + ") is no longer available. You should check other user's backpack and see if it's still there.");
        } else {
            // Something was loading very slowly, restart init...
            this.init();
        }
    },

    clear: function(slots) {
        var timeout = 100;

        var added_items = jQuery(slots);
        var items = added_items.find("div.itemHolder").find("div.item");

        for(i = 0; i < items.length; i++) {
            setTimeout(MoveItemToInventory, i * timeout, items[i]);
        }

        setTimeout(function() {
            tradeOfferWindow.summarise();
        }, items.length * timeout + 500);
    }
};

jQuery(function() {

var location = window.location.pathname;

// Append CSS style.
var style = "<style type='text/css'>" +
            ".tradeoffer_items_summary { color: #fff; font-size: 10px; }" +
            ".warning { color: #ff4422; }" +
            ".info { padding: 1px 3px; border-radius: 4px; background-color: #1155FF; border: 1px solid #003399; font-size: 14px; }" +
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

            // Attach links
            tradeOfferPage.attach_links(jQuery(this));

            // Check if trade offer is "unavailable"
            // Do this only for /tradeoffers page and nothing else
            var is_ok = location.indexOf("tradeoffers", location.length - "tradeoffers".length) !== -1;
            is_ok = is_ok || location.indexOf("tradeoffers/", location.length - "tradeoffers/".length) !== -1;

            if(is_ok) {
                var is_unavailable = jQuery(this).find("div.tradeoffer_items_banner").text().indexOf("Items Now Unavailable For Trade") > -1;
                if(is_unavailable) {
                    var trade_offer_id = jQuery(this).attr("id").split("_")[1];
                    var footer = jQuery(this).find("div.tradeoffer_footer");

                    var text = "<span class=\"info\">This trade offer is stuck and invalid, but you can still <strong>decline</strong> it.</span>";
                    footer.prepend("<div class=\"tradeoffer_footer_actions\"><a class=\"whiteLink\" href=\"javascript:DeclineTradeOffer('" + trade_offer_id + "');\">" + text + "</a></div>");
                }
            }
        });
    }

    // Single trade offer window ...
} else if(location.indexOf("tradeoffer") > -1) {

    // Append new divs ...
    jQuery("div.trade_left div.trade_box_contents").append("<div class=\"trade_rule selectableNone\"/><div class=\"item_adder\"/>");
    jQuery("div.item_adder").append("<div class=\"selectableNone\">Add multiple items:</div>");
    jQuery("div.item_adder").append("<input id=\"amount_control\" class=\"filter_search_box\" type=\"text\" placeholder=\"16\"> ");
    jQuery("div.item_adder").append("<button id=\"btn_additems\" type=\"button\" class=\"btn_custom\">Add</button><br><br>");
    jQuery("div.item_adder").append("<button id=\"btn_clearmyitems\" type=\"button\" class=\"btn_custom\">Clear my items</button>");
    jQuery("div.item_adder").append(" <button id=\"btn_cleartheiritems\" type=\"button\" class=\"btn_custom\">Clear their items</button>");

    jQuery("div.trade_left div.trade_box_contents").append("<div class=\"trade_rule selectableNone\"/><div class=\"tradeoffer_items_summary\"/>");

    // Refresh summaries whenever ...
    jQuery("body").click(function() {
        setTimeout(function() { 
            tradeOfferWindow.summarise();
        }, 500);
    });

    // hack to fix empty space under inventory
    // TODO get rid of this if they ever fix it
    setInterval(function() {
        if(jQuery("#inventory_displaycontrols").height() > 50) {
            console.log("sme tu");
            if(jQuery("div#inventories").css("marginBottom") === "8px") {
                jQuery("div#inventories").css("marginBottom", "7px");
            } else {
                jQuery("div#inventories").css("marginBottom", "8px");
            }
        }
    }, 500);

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

    jQuery("button#btn_clearmyitems").click(function() {
        tradeOfferWindow.clear("div#your_slots");
    });

    jQuery("button#btn_cleartheiritems").click(function() {
        tradeOfferWindow.clear("div#their_slots");
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

    if(unsafeWindow.g_daysMyEscrow > 0) {
        var hours = unsafeWindow.g_daysMyEscrow * 24;
        jQuery("div.trade_partner_headline").append("<div class='warning'>(You do not have mobile confirmations enabled. Items will be held for <b>" + hours + "</b> hours.)</div>")
    }

    if(unsafeWindow.g_daysTheirEscrow > 0) {
        var hours = unsafeWindow.g_daysTheirEscrow * 24;
        jQuery("div.trade_partner_headline").append("<div class='warning'>(Other user does not have mobile confirmations enabled. Items will be held for <b>" + hours + "</b> hours.)</div>")
    }
}

});
