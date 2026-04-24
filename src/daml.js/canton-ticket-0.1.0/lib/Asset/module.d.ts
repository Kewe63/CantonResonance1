// Generated from Asset.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation';
import * as damlTypes from '@daml/types';
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger';

import * as pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7 from '@daml.js/40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7';
import * as pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662 from '@daml.js/d14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662';

export declare type Reject_Mint = {
};

export declare const Reject_Mint:
  damlTypes.Serializable<Reject_Mint> & {
  }
;


export declare type Accept_Mint = {
};

export declare const Accept_Mint:
  damlTypes.Serializable<Accept_Mint> & {
  }
;


export declare type AssetMintProposal = {
  issuer: damlTypes.Party;
  owner: damlTypes.Party;
  currency: string;
  amount: damlTypes.Numeric;
};

export declare interface AssetMintProposalInterface {
  Accept_Mint: damlTypes.Choice<AssetMintProposal, Accept_Mint, damlTypes.ContractId<Asset>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<AssetMintProposal, undefined>>;
  Archive: damlTypes.Choice<AssetMintProposal, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<AssetMintProposal, undefined>>;
  Reject_Mint: damlTypes.Choice<AssetMintProposal, Reject_Mint, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<AssetMintProposal, undefined>>;
}
export declare const AssetMintProposal:
  damlTypes.Template<AssetMintProposal, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Asset:AssetMintProposal'> &
  damlTypes.ToInterface<AssetMintProposal, never> &
  AssetMintProposalInterface;

export declare namespace AssetMintProposal {
  export type CreateEvent = damlLedger.CreateEvent<AssetMintProposal, undefined, typeof AssetMintProposal.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<AssetMintProposal, typeof AssetMintProposal.templateId>
  export type Event = damlLedger.Event<AssetMintProposal, undefined, typeof AssetMintProposal.templateId>
  export type QueryResult = damlLedger.QueryResult<AssetMintProposal, undefined, typeof AssetMintProposal.templateId>
}



export declare type Merge = {
  otherCid: damlTypes.ContractId<Asset>;
};

export declare const Merge:
  damlTypes.Serializable<Merge> & {
  }
;


export declare type Split = {
  splitAmount: damlTypes.Numeric;
};

export declare const Split:
  damlTypes.Serializable<Split> & {
  }
;


export declare type Transfer = {
  newOwner: damlTypes.Party;
};

export declare const Transfer:
  damlTypes.Serializable<Transfer> & {
  }
;


export declare type Asset = {
  issuer: damlTypes.Party;
  owner: damlTypes.Party;
  currency: string;
  amount: damlTypes.Numeric;
};

export declare interface AssetInterface {
  Transfer: damlTypes.Choice<Asset, Transfer, damlTypes.ContractId<Asset>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Asset, undefined>>;
  Split: damlTypes.Choice<Asset, Split, pkg40f452260bef3f29dede136108fc08a88d5a5250310281067087da6f0baddff7.DA.Types.Tuple2<damlTypes.ContractId<Asset>, damlTypes.ContractId<Asset>>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Asset, undefined>>;
  Merge: damlTypes.Choice<Asset, Merge, damlTypes.ContractId<Asset>, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Asset, undefined>>;
  Archive: damlTypes.Choice<Asset, pkgd14e08374fc7197d6a0de468c968ae8ba3aadbf9315476fd39071831f5923662.DA.Internal.Template.Archive, {}, undefined> & damlTypes.ChoiceFrom<damlTypes.Template<Asset, undefined>>;
}
export declare const Asset:
  damlTypes.Template<Asset, undefined, 'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0:Asset:Asset'> &
  damlTypes.ToInterface<Asset, never> &
  AssetInterface;

export declare namespace Asset {
  export type CreateEvent = damlLedger.CreateEvent<Asset, undefined, typeof Asset.templateId>
  export type ArchiveEvent = damlLedger.ArchiveEvent<Asset, typeof Asset.templateId>
  export type Event = damlLedger.Event<Asset, undefined, typeof Asset.templateId>
  export type QueryResult = damlLedger.QueryResult<Asset, undefined, typeof Asset.templateId>
}


