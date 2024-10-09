import { Context, Schema } from 'koishi';
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const name = "ddnetfriends";
export declare const Config: Schema<Config>;
export interface Config {
    useimage: boolean;
    enablewarband: boolean;
}
declare module 'koishi' {
    interface Tables {
        ddnetfriendsdata: ddnetfriendsdata;
        ddnet_group_data: ddnet_group_data;
    }
}
export interface ddnetfriendsdata {
    id: number;
    userid: string;
    friendname: string;
    playername: string;
    Special_Attention: string;
}
export interface ddnet_group_data {
    id: number;
    user_id: string;
    last_sent_time: string;
    friendname: string;
}
export declare function apply(ctx: Context, Config: any, session: any): Promise<void>;
