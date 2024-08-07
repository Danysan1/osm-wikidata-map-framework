/* tslint:disable */
/* eslint-disable */
/**
 * Wikimedia Commons REST API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * 
 * @export
 */
export const ActionType = {
    Abusefiltercheckmatch: 'abusefiltercheckmatch',
    Abusefilterchecksyntax: 'abusefilterchecksyntax',
    Abusefilterevalexpression: 'abusefilterevalexpression',
    Abusefilterunblockautopromote: 'abusefilterunblockautopromote',
    Abuselogprivatedetails: 'abuselogprivatedetails',
    Acquiretempusername: 'acquiretempusername',
    Aggregategroups: 'aggregategroups',
    Antispoof: 'antispoof',
    Block: 'block',
    Centralauthtoken: 'centralauthtoken',
    Centralnoticecdncacheupdatebanner: 'centralnoticecdncacheupdatebanner',
    Centralnoticechoicedata: 'centralnoticechoicedata',
    Centralnoticequerycampaign: 'centralnoticequerycampaign',
    Changeauthenticationdata: 'changeauthenticationdata',
    Changecontentmodel: 'changecontentmodel',
    Checktoken: 'checktoken',
    CirrusConfigDump: 'cirrus-config-dump',
    CirrusMappingDump: 'cirrus-mapping-dump',
    CirrusProfilesDump: 'cirrus-profiles-dump',
    CirrusSettingsDump: 'cirrus-settings-dump',
    Clearhasmsg: 'clearhasmsg',
    Clientlogin: 'clientlogin',
    Compare: 'compare',
    Createaccount: 'createaccount',
    Createlocalaccount: 'createlocalaccount',
    Delete: 'delete',
    Deleteglobalaccount: 'deleteglobalaccount',
    Discussiontoolsedit: 'discussiontoolsedit',
    Discussiontoolsfindcomment: 'discussiontoolsfindcomment',
    Discussiontoolsgetsubscriptions: 'discussiontoolsgetsubscriptions',
    Discussiontoolssubscribe: 'discussiontoolssubscribe',
    Discussiontoolsthank: 'discussiontoolsthank',
    Echocreateevent: 'echocreateevent',
    Echomarkread: 'echomarkread',
    Echomarkseen: 'echomarkseen',
    Echomute: 'echomute',
    Edit: 'edit',
    Editmassmessagelist: 'editmassmessagelist',
    Emailuser: 'emailuser',
    Expandtemplates: 'expandtemplates',
    Featuredfeed: 'featuredfeed',
    Feedcontributions: 'feedcontributions',
    Feedrecentchanges: 'feedrecentchanges',
    Feedwatchlist: 'feedwatchlist',
    Filerevert: 'filerevert',
    Flickrblacklist: 'flickrblacklist',
    Flow: 'flow',
    FlowParsoidUtils: 'flow-parsoid-utils',
    Flowthank: 'flowthank',
    Globalblock: 'globalblock',
    Globalpreferenceoverrides: 'globalpreferenceoverrides',
    Globalpreferences: 'globalpreferences',
    Globaluserrights: 'globaluserrights',
    Groupreview: 'groupreview',
    Help: 'help',
    Imagerotate: 'imagerotate',
    Import: 'import',
    Jsonconfig: 'jsonconfig',
    Languagesearch: 'languagesearch',
    Linkaccount: 'linkaccount',
    Login: 'login',
    Logout: 'logout',
    Managetags: 'managetags',
    Markfortranslation: 'markfortranslation',
    Massmessage: 'massmessage',
    Mediadetection: 'mediadetection',
    Mergehistory: 'mergehistory',
    Move: 'move',
    Opensearch: 'opensearch',
    Options: 'options',
    Paraminfo: 'paraminfo',
    Parse: 'parse',
    Patrol: 'patrol',
    Protect: 'protect',
    Purge: 'purge',
    Query: 'query',
    Removeauthenticationdata: 'removeauthenticationdata',
    Resetpassword: 'resetpassword',
    Revisiondelete: 'revisiondelete',
    Rollback: 'rollback',
    Rsd: 'rsd',
    Searchtranslations: 'searchtranslations',
    Setglobalaccountstatus: 'setglobalaccountstatus',
    Setnotificationtimestamp: 'setnotificationtimestamp',
    Setpagelanguage: 'setpagelanguage',
    Shortenurl: 'shortenurl',
    Sitematrix: 'sitematrix',
    Spamblacklist: 'spamblacklist',
    Streamconfigs: 'streamconfigs',
    Strikevote: 'strikevote',
    Tag: 'tag',
    Templatedata: 'templatedata',
    Thank: 'thank',
    Titleblacklist: 'titleblacklist',
    Torblock: 'torblock',
    Transcodereset: 'transcodereset',
    Translationaids: 'translationaids',
    Translationreview: 'translationreview',
    Translationstats: 'translationstats',
    Ttmserver: 'ttmserver',
    Unblock: 'unblock',
    Undelete: 'undelete',
    Unlinkaccount: 'unlinkaccount',
    Upload: 'upload',
    Userrights: 'userrights',
    Validatepassword: 'validatepassword',
    Watch: 'watch',
    Wbavailablebadges: 'wbavailablebadges',
    Wbcheckconstraintparameters: 'wbcheckconstraintparameters',
    Wbcheckconstraints: 'wbcheckconstraints',
    Wbcreateclaim: 'wbcreateclaim',
    Wbcreateredirect: 'wbcreateredirect',
    Wbeditentity: 'wbeditentity',
    Wbformatentities: 'wbformatentities',
    Wbformatvalue: 'wbformatvalue',
    Wbgetclaims: 'wbgetclaims',
    Wbgetentities: 'wbgetentities',
    Wblinktitles: 'wblinktitles',
    Wbmergeitems: 'wbmergeitems',
    Wbparsevalue: 'wbparsevalue',
    Wbremoveclaims: 'wbremoveclaims',
    Wbremovequalifiers: 'wbremovequalifiers',
    Wbremovereferences: 'wbremovereferences',
    Wbsearchentities: 'wbsearchentities',
    Wbsetaliases: 'wbsetaliases',
    Wbsetclaim: 'wbsetclaim',
    Wbsetclaimvalue: 'wbsetclaimvalue',
    Wbsetdescription: 'wbsetdescription',
    Wbsetlabel: 'wbsetlabel',
    Wbsetqualifier: 'wbsetqualifier',
    Wbsetreference: 'wbsetreference',
    Wbsetsitelink: 'wbsetsitelink',
    WebappManifest: 'webapp-manifest',
    Webauthn: 'webauthn',
    Wikilove: 'wikilove'
} as const;
export type ActionType = typeof ActionType[keyof typeof ActionType];


export function instanceOfActionType(value: any): boolean {
    for (const key in ActionType) {
        if (Object.prototype.hasOwnProperty.call(ActionType, key)) {
            if ((ActionType as Record<string, ActionType>)[key] === value) {
                return true;
            }
        }
    }
    return false;
}

export function ActionTypeFromJSON(json: any): ActionType {
    return ActionTypeFromJSONTyped(json, false);
}

export function ActionTypeFromJSONTyped(json: any, ignoreDiscriminator: boolean): ActionType {
    return json as ActionType;
}

export function ActionTypeToJSON(value?: ActionType | null): any {
    return value as any;
}

