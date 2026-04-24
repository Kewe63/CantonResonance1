"use strict";
/* eslint-disable-next-line no-unused-vars */
function __export(m) {
/* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable-next-line no-unused-vars */
var jtv = require('@mojotech/json-type-validation');
/* eslint-disable-next-line no-unused-vars */
var damlTypes = require('@daml/types');
/* eslint-disable-next-line no-unused-vars */
var damlLedger = require('@daml/ledger');

var pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7 = require('@daml.js/40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7');
var pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662 = require('@daml.js/d14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662');


exports.UsedTicket = damlTypes.assembleTemplate(
{
  templateId: 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:UsedTicket',
  keyDecoder: damlTypes.lazyMemo(function () { return jtv.constant(undefined); }),
  keyEncode: function () { throw 'EncodeError'; },
  decoder: damlTypes.lazyMemo(function () { return jtv.object({owner: damlTypes.Party.decoder, organizer: damlTypes.Party.decoder, artist: damlTypes.Party.decoder, eventName: damlTypes.Text.decoder, eventDate: damlTypes.Text.decoder, seat: damlTypes.Text.decoder, }); }),
  encode: function (__typed__) {
  return {
    owner: damlTypes.Party.encode(__typed__.owner),
    organizer: damlTypes.Party.encode(__typed__.organizer),
    artist: damlTypes.Party.encode(__typed__.artist),
    eventName: damlTypes.Text.encode(__typed__.eventName),
    eventDate: damlTypes.Text.encode(__typed__.eventDate),
    seat: damlTypes.Text.encode(__typed__.seat),
  };
}
,
  Archive: {
    template: function () { return exports.UsedTicket; },
    choiceName: 'Archive',
    argumentDecoder: damlTypes.lazyMemo(function () { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.decoder; }),
    argumentEncode: function (__typed__) { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
    resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
  },
}

);


damlTypes.registerTemplate(exports.UsedTicket, ['a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0', 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0']);



exports.RoyaltyReceipt = damlTypes.assembleTemplate(
{
  templateId: 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:RoyaltyReceipt',
  keyDecoder: damlTypes.lazyMemo(function () { return jtv.constant(undefined); }),
  keyEncode: function () { throw 'EncodeError'; },
  decoder: damlTypes.lazyMemo(function () { return jtv.object({artist: damlTypes.Party.decoder, organizer: damlTypes.Party.decoder, eventName: damlTypes.Text.decoder, salePrice: damlTypes.Numeric(10).decoder, royaltyPct: damlTypes.Numeric(10).decoder, royaltyAmount: damlTypes.Numeric(10).decoder, sellerShare: damlTypes.Numeric(10).decoder, seller: damlTypes.Party.decoder, buyer: damlTypes.Party.decoder, ticketSeat: damlTypes.Text.decoder, }); }),
  encode: function (__typed__) {
  return {
    artist: damlTypes.Party.encode(__typed__.artist),
    organizer: damlTypes.Party.encode(__typed__.organizer),
    eventName: damlTypes.Text.encode(__typed__.eventName),
    salePrice: damlTypes.Numeric(10).encode(__typed__.salePrice),
    royaltyPct: damlTypes.Numeric(10).encode(__typed__.royaltyPct),
    royaltyAmount: damlTypes.Numeric(10).encode(__typed__.royaltyAmount),
    sellerShare: damlTypes.Numeric(10).encode(__typed__.sellerShare),
    seller: damlTypes.Party.encode(__typed__.seller),
    buyer: damlTypes.Party.encode(__typed__.buyer),
    ticketSeat: damlTypes.Text.encode(__typed__.ticketSeat),
  };
}
,
  Archive: {
    template: function () { return exports.RoyaltyReceipt; },
    choiceName: 'Archive',
    argumentDecoder: damlTypes.lazyMemo(function () { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.decoder; }),
    argumentEncode: function (__typed__) { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
    resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
  },
}

);


damlTypes.registerTemplate(exports.RoyaltyReceipt, ['a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0', 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0']);



exports.UpdatePrice = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({newPrice: damlTypes.Numeric(10).decoder, }); }),
  encode: function (__typed__) {
  return {
    newPrice: damlTypes.Numeric(10).encode(__typed__.newPrice),
  };
}
,
};



exports.CancelListing = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({}); }),
  encode: function (__typed__) {
  return {
  };
}
,
};



exports.BuySecondary = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({newOwner: damlTypes.Party.decoder, }); }),
  encode: function (__typed__) {
  return {
    newOwner: damlTypes.Party.encode(__typed__.newOwner),
  };
}
,
};



exports.SecondaryListing = damlTypes.assembleTemplate(
{
  templateId: 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:SecondaryListing',
  keyDecoder: damlTypes.lazyMemo(function () { return jtv.constant(undefined); }),
  keyEncode: function () { throw 'EncodeError'; },
  decoder: damlTypes.lazyMemo(function () { return jtv.object({ticket: exports.UserTicket.decoder, seller: damlTypes.Party.decoder, price: damlTypes.Numeric(10).decoder, createdAt: damlTypes.Text.decoder, }); }),
  encode: function (__typed__) {
  return {
    ticket: exports.UserTicket.encode(__typed__.ticket),
    seller: damlTypes.Party.encode(__typed__.seller),
    price: damlTypes.Numeric(10).encode(__typed__.price),
    createdAt: damlTypes.Text.encode(__typed__.createdAt),
  };
}
,
  Archive: {
    template: function () { return exports.SecondaryListing; },
    choiceName: 'Archive',
    argumentDecoder: damlTypes.lazyMemo(function () { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.decoder; }),
    argumentEncode: function (__typed__) { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
    resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
  },
  BuySecondary: {
    template: function () { return exports.SecondaryListing; },
    choiceName: 'BuySecondary',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.BuySecondary.decoder; }),
    argumentEncode: function (__typed__) { return exports.BuySecondary.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2(damlTypes.ContractId(exports.UserTicket), damlTypes.ContractId(exports.RoyaltyReceipt)).decoder; }),
    resultEncode: function (__typed__) { return pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2(damlTypes.ContractId(exports.UserTicket), damlTypes.ContractId(exports.RoyaltyReceipt)).encode(__typed__); },
  },
  CancelListing: {
    template: function () { return exports.SecondaryListing; },
    choiceName: 'CancelListing',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.CancelListing.decoder; }),
    argumentEncode: function (__typed__) { return exports.CancelListing.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.UserTicket).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.UserTicket).encode(__typed__); },
  },
  UpdatePrice: {
    template: function () { return exports.SecondaryListing; },
    choiceName: 'UpdatePrice',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.UpdatePrice.decoder; }),
    argumentEncode: function (__typed__) { return exports.UpdatePrice.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.SecondaryListing).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.SecondaryListing).encode(__typed__); },
  },
}

);


damlTypes.registerTemplate(exports.SecondaryListing, ['a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0', 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0']);



exports.UseTicket = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({}); }),
  encode: function (__typed__) {
  return {
  };
}
,
};



exports.ListForSale = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({sellPrice: damlTypes.Numeric(10).decoder, }); }),
  encode: function (__typed__) {
  return {
    sellPrice: damlTypes.Numeric(10).encode(__typed__.sellPrice),
  };
}
,
};



exports.UserTicket = damlTypes.assembleTemplate(
{
  templateId: 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:UserTicket',
  keyDecoder: damlTypes.lazyMemo(function () { return jtv.constant(undefined); }),
  keyEncode: function () { throw 'EncodeError'; },
  decoder: damlTypes.lazyMemo(function () { return jtv.object({owner: damlTypes.Party.decoder, organizer: damlTypes.Party.decoder, artist: damlTypes.Party.decoder, public: damlTypes.Party.decoder, eventName: damlTypes.Text.decoder, eventDate: damlTypes.Text.decoder, eventVenue: damlTypes.Text.decoder, seat: damlTypes.Text.decoder, originalPrice: damlTypes.Numeric(10).decoder, currentPrice: damlTypes.Numeric(10).decoder, royaltyPct: damlTypes.Numeric(10).decoder, maxResaleMultiplier: damlTypes.Optional(damlTypes.Numeric(10)).decoder, isUsed: damlTypes.Bool.decoder, transferCount: damlTypes.Int.decoder, }); }),
  encode: function (__typed__) {
  return {
    owner: damlTypes.Party.encode(__typed__.owner),
    organizer: damlTypes.Party.encode(__typed__.organizer),
    artist: damlTypes.Party.encode(__typed__.artist),
    public: damlTypes.Party.encode(__typed__.public),
    eventName: damlTypes.Text.encode(__typed__.eventName),
    eventDate: damlTypes.Text.encode(__typed__.eventDate),
    eventVenue: damlTypes.Text.encode(__typed__.eventVenue),
    seat: damlTypes.Text.encode(__typed__.seat),
    originalPrice: damlTypes.Numeric(10).encode(__typed__.originalPrice),
    currentPrice: damlTypes.Numeric(10).encode(__typed__.currentPrice),
    royaltyPct: damlTypes.Numeric(10).encode(__typed__.royaltyPct),
    maxResaleMultiplier: damlTypes.Optional(damlTypes.Numeric(10)).encode(__typed__.maxResaleMultiplier),
    isUsed: damlTypes.Bool.encode(__typed__.isUsed),
    transferCount: damlTypes.Int.encode(__typed__.transferCount),
  };
}
,
  Archive: {
    template: function () { return exports.UserTicket; },
    choiceName: 'Archive',
    argumentDecoder: damlTypes.lazyMemo(function () { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.decoder; }),
    argumentEncode: function (__typed__) { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
    resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
  },
  ListForSale: {
    template: function () { return exports.UserTicket; },
    choiceName: 'ListForSale',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.ListForSale.decoder; }),
    argumentEncode: function (__typed__) { return exports.ListForSale.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.SecondaryListing).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.SecondaryListing).encode(__typed__); },
  },
  UseTicket: {
    template: function () { return exports.UserTicket; },
    choiceName: 'UseTicket',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.UseTicket.decoder; }),
    argumentEncode: function (__typed__) { return exports.UseTicket.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.UsedTicket).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.UsedTicket).encode(__typed__); },
  },
}

);


damlTypes.registerTemplate(exports.UserTicket, ['a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0', 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0']);



exports.UpdateEvent = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({newName: damlTypes.Optional(damlTypes.Text).decoder, newDate: damlTypes.Optional(damlTypes.Text).decoder, newVenue: damlTypes.Optional(damlTypes.Text).decoder, newPrice: damlTypes.Optional(damlTypes.Numeric(10)).decoder, }); }),
  encode: function (__typed__) {
  return {
    newName: damlTypes.Optional(damlTypes.Text).encode(__typed__.newName),
    newDate: damlTypes.Optional(damlTypes.Text).encode(__typed__.newDate),
    newVenue: damlTypes.Optional(damlTypes.Text).encode(__typed__.newVenue),
    newPrice: damlTypes.Optional(damlTypes.Numeric(10)).encode(__typed__.newPrice),
  };
}
,
};



exports.CancelEvent = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({}); }),
  encode: function (__typed__) {
  return {
  };
}
,
};



exports.BuyTicket = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({buyer: damlTypes.Party.decoder, seat: damlTypes.Text.decoder, }); }),
  encode: function (__typed__) {
  return {
    buyer: damlTypes.Party.encode(__typed__.buyer),
    seat: damlTypes.Text.encode(__typed__.seat),
  };
}
,
};



exports.Event = damlTypes.assembleTemplate(
{
  templateId: 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:Event',
  keyDecoder: damlTypes.lazyMemo(function () { return jtv.constant(undefined); }),
  keyEncode: function () { throw 'EncodeError'; },
  decoder: damlTypes.lazyMemo(function () { return jtv.object({organizer: damlTypes.Party.decoder, artist: damlTypes.Party.decoder, public: damlTypes.Party.decoder, name: damlTypes.Text.decoder, date: damlTypes.Text.decoder, venue: damlTypes.Text.decoder, totalTickets: damlTypes.Int.decoder, price: damlTypes.Numeric(10).decoder, royaltyPct: damlTypes.Numeric(10).decoder, ticketsSold: damlTypes.Int.decoder, maxResaleMultiplier: damlTypes.Optional(damlTypes.Numeric(10)).decoder, isCancelled: damlTypes.Bool.decoder, }); }),
  encode: function (__typed__) {
  return {
    organizer: damlTypes.Party.encode(__typed__.organizer),
    artist: damlTypes.Party.encode(__typed__.artist),
    public: damlTypes.Party.encode(__typed__.public),
    name: damlTypes.Text.encode(__typed__.name),
    date: damlTypes.Text.encode(__typed__.date),
    venue: damlTypes.Text.encode(__typed__.venue),
    totalTickets: damlTypes.Int.encode(__typed__.totalTickets),
    price: damlTypes.Numeric(10).encode(__typed__.price),
    royaltyPct: damlTypes.Numeric(10).encode(__typed__.royaltyPct),
    ticketsSold: damlTypes.Int.encode(__typed__.ticketsSold),
    maxResaleMultiplier: damlTypes.Optional(damlTypes.Numeric(10)).encode(__typed__.maxResaleMultiplier),
    isCancelled: damlTypes.Bool.encode(__typed__.isCancelled),
  };
}
,
  Archive: {
    template: function () { return exports.Event; },
    choiceName: 'Archive',
    argumentDecoder: damlTypes.lazyMemo(function () { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.decoder; }),
    argumentEncode: function (__typed__) { return pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
    resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
  },
  BuyTicket: {
    template: function () { return exports.Event; },
    choiceName: 'BuyTicket',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.BuyTicket.decoder; }),
    argumentEncode: function (__typed__) { return exports.BuyTicket.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2(damlTypes.ContractId(exports.Event), damlTypes.ContractId(exports.UserTicket)).decoder; }),
    resultEncode: function (__typed__) { return pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2(damlTypes.ContractId(exports.Event), damlTypes.ContractId(exports.UserTicket)).encode(__typed__); },
  },
  CancelEvent: {
    template: function () { return exports.Event; },
    choiceName: 'CancelEvent',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.CancelEvent.decoder; }),
    argumentEncode: function (__typed__) { return exports.CancelEvent.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.Event).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.Event).encode(__typed__); },
  },
  UpdateEvent: {
    template: function () { return exports.Event; },
    choiceName: 'UpdateEvent',
    argumentDecoder: damlTypes.lazyMemo(function () { return exports.UpdateEvent.decoder; }),
    argumentEncode: function (__typed__) { return exports.UpdateEvent.encode(__typed__); },
    resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.ContractId(exports.Event).decoder; }),
    resultEncode: function (__typed__) { return damlTypes.ContractId(exports.Event).encode(__typed__); },
  },
}

);


damlTypes.registerTemplate(exports.Event, ['a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0', 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0']);

