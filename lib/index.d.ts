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
    }
}
export interface ddnetfriendsdata {
    id: number;
    userid: string;
    friendname: string;
    playername: string;
}
export declare function apply(ctx: Context, Config: any): Promise<void>;
