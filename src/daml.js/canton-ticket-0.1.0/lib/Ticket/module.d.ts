// Generated from Ticket.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation';
import * as damlTypes from '@daml/types';
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger';

import * as pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7 from '@daml.js/40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7';
import * as pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662 from '@daml.js/d14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662';

export declare type UsedTicket = {
  owner: damlTypes.Party;
  organizer: damlTypes.Party;
  artist: damlTypes.Party;
  eventName: string;
  eventDate: string;
  seat: string;
};

export declare interface UsedTicketInterface {
  Archive: damlTypes.Choice<UsedTicket, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<UsedTicket, undefined>>;
}
export declare const UsedTicket:
  damlTypes.Template<UsedTicket, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:UsedTicket'> &
  damlTypes.ToInterface<UsedTicket, never> &
  UsedTicketInterface;

export declare namespace UsedTicket {
  export type CreateEvent = damlLedger.CreateEvent<UsedTicket, undefined, typeof UsedTicket.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<UsedTicket, typeof UsedTicket.templateId>
  export type Event = damlLedger.Event<UsedTicket, undefined, typeof UsedTicket.templateId>
  export type QueryResult = damlLedger.QueryResult<UsedTicket, undefined, typeof UsedTicket.templateId>
}



export declare type RoyaltyReceipt = {
  artist: damlTypes.Party;
  organizer: damlTypes.Party;
  eventName: string;
  salePrice: damlTypes.Numeric;
  royaltyPct: damlTypes.Numeric;
  royaltyAmount: damlTypes.Numeric;
  sellerShare: damlTypes.Numeric;
  seller: damlTypes.Party;
  buyer: damlTypes.Party;
  ticketSeat: string;
};

export declare interface RoyaltyReceiptInterface {
  Archive: damlTypes.Choice<RoyaltyReceipt, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<RoyaltyReceipt, undefined>>;
}
export declare const RoyaltyReceipt:
  damlTypes.Template<RoyaltyReceipt, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:RoyaltyReceipt'> &
  damlTypes.ToInterface<RoyaltyReceipt, never> &
  RoyaltyReceiptInterface;

export declare namespace RoyaltyReceipt {
  export type CreateEvent = damlLedger.CreateEvent<RoyaltyReceipt, undefined, typeof RoyaltyReceipt.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<RoyaltyReceipt, typeof RoyaltyReceipt.templateId>
  export type Event = damlLedger.Event<RoyaltyReceipt, undefined, typeof RoyaltyReceipt.templateId>
  export type QueryResult = damlLedger.QueryResult<RoyaltyReceipt, undefined, typeof RoyaltyReceipt.templateId>
}



export declare type UpdatePrice = {
  newPrice: damlTypes.Numeric;
};

export declare const UpdatePrice:
  damlTypes.Serializable<UpdatePrice> & {
  }
;


export declare type CancelListing = {
};

export declare const CancelListing:
  damlTypes.Serializable<CancelListing> & {
  }
;


export declare type BuySecondary = {
  newOwner: damlTypes.Party;
};

export declare const BuySecondary:
  damlTypes.Serializable<BuySecondary> & {
  }
;


export declare type SecondaryListing = {
  ticket: UserTicket;
  seller: damlTypes.Party;
  price: damlTypes.Numeric;
  createdAt: string;
};

export declare interface SecondaryListingInterface {
  Archive: damlTypes.Choice<SecondaryListing, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<SecondaryListing, undefined>>;
  BuySecondary: damlTypes.Choice<SecondaryListing, BuySecondary, pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2<damlTypes.ContractId<UserTicket>, damlTypes.ContractId<RoyaltyReceipt>>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<SecondaryListing, undefined>>;
  CancelListing: damlTypes.Choice<SecondaryListing, CancelListing, damlTypes.ContractId<UserTicket>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<SecondaryListing, undefined>>;
  UpdatePrice: damlTypes.Choice<SecondaryListing, UpdatePrice, damlTypes.ContractId<SecondaryListing>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<SecondaryListing, undefined>>;
}
export declare const SecondaryListing:
  damlTypes.Template<SecondaryListing, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:SecondaryListing'> &
  damlTypes.ToInterface<SecondaryListing, never> &
  SecondaryListingInterface;

export declare namespace SecondaryListing {
  export type CreateEvent = damlLedger.CreateEvent<SecondaryListing, undefined, typeof SecondaryListing.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<SecondaryListing, typeof SecondaryListing.templateId>
  export type Event = damlLedger.Event<SecondaryListing, undefined, typeof SecondaryListing.templateId>
  export type QueryResult = damlLedger.QueryResult<SecondaryListing, undefined, typeof SecondaryListing.templateId>
}



export declare type UseTicket = {
};

export declare const UseTicket:
  damlTypes.Serializable<UseTicket> & {
  }
;


export declare type ListForSale = {
  sellPrice: damlTypes.Numeric;
};

export declare const ListForSale:
  damlTypes.Serializable<ListForSale> & {
  }
;


export declare type UserTicket = {
  owner: damlTypes.Party;
  organizer: damlTypes.Party;
  artist: damlTypes.Party;
  public: damlTypes.Party;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  seat: string;
  originalPrice: damlTypes.Numeric;
  currentPrice: damlTypes.Numeric;
  royaltyPct: damlTypes.Numeric;
  maxResaleMultiplier: damlTypes.Optional<damlTypes.Numeric>;
  isUsed: boolean;
  transferCount: damlTypes.Int;
};

export declare interface UserTicketInterface {
  Archive: damlTypes.Choice<UserTicket, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<UserTicket, undefined>>;
  ListForSale: damlTypes.Choice<UserTicket, ListForSale, damlTypes.ContractId<SecondaryListing>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<UserTicket, undefined>>;
  UseTicket: damlTypes.Choice<UserTicket, UseTicket, damlTypes.ContractId<UsedTicket>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<UserTicket, undefined>>;
}
export declare const UserTicket:
  damlTypes.Template<UserTicket, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:UserTicket'> &
  damlTypes.ToInterface<UserTicket, never> &
  UserTicketInterface;

export declare namespace UserTicket {
  export type CreateEvent = damlLedger.CreateEvent<UserTicket, undefined, typeof UserTicket.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<UserTicket, typeof UserTicket.templateId>
  export type Event = damlLedger.Event<UserTicket, undefined, typeof UserTicket.templateId>
  export type QueryResult = damlLedger.QueryResult<UserTicket, undefined, typeof UserTicket.templateId>
}



export declare type UpdateEvent = {
  newName: damlTypes.Optional<string>;
  newDate: damlTypes.Optional<string>;
  newVenue: damlTypes.Optional<string>;
  newPrice: damlTypes.Optional<damlTypes.Numeric>;
};

export declare const UpdateEvent:
  damlTypes.Serializable<UpdateEvent> & {
  }
;


export declare type CancelEvent = {
};

export declare const CancelEvent:
  damlTypes.Serializable<CancelEvent> & {
  }
;


export declare type BuyTicket = {
  buyer: damlTypes.Party;
  seat: string;
};

export declare const BuyTicket:
  damlTypes.Serializable<BuyTicket> & {
  }
;


export declare type Event = {
  organizer: damlTypes.Party;
  artist: damlTypes.Party;
  public: damlTypes.Party;
  name: string;
  date: string;
  venue: string;
  totalTickets: damlTypes.Int;
  price: damlTypes.Numeric;
  royaltyPct: damlTypes.Numeric;
  ticketsSold: damlTypes.Int;
  maxResaleMultiplier: damlTypes.Optional<damlTypes.Numeric>;
  isCancelled: boolean;
};

export declare interface EventInterface {
  Archive: damlTypes.Choice<Event, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Event, undefined>>;
  BuyTicket: damlTypes.Choice<Event, BuyTicket, pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2<damlTypes.ContractId<Event>, damlTypes.ContractId<UserTicket>>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Event, undefined>>;
  CancelEvent: damlTypes.Choice<Event, CancelEvent, damlTypes.ContractId<Event>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Event, undefined>>;
  UpdateEvent: damlTypes.Choice<Event, UpdateEvent, damlTypes.ContractId<Event>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Event, undefined>>;
}
export declare const Event:
  damlTypes.Template<Event, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Ticket:Event'> &
  damlTypes.ToInterface<Event, never> &
  EventInterface;

export declare namespace Event {
  export type CreateEvent = damlLedger.CreateEvent<Event, undefined, typeof Event.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<Event, typeof Event.templateId>
  export type Event = damlLedger.Event<Event, undefined, typeof Event.templateId>
  export type QueryResult = damlLedger.QueryResult<Event, undefined, typeof Event.templateId>
}


