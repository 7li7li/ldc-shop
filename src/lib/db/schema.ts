import * as mysqlSchema from './schema.mysql';
import * as sqliteSchema from './schema.sqlite';

const selected: any = process.env.DB_TYPE?.trim().toLowerCase() === 'mysql'
    ? mysqlSchema
    : sqliteSchema;

export const products: any = selected.products;
export const cards: any = selected.cards;
export const orders: any = selected.orders;
export const loginUsers: any = selected.loginUsers;
export const dailyCheckins: any = selected.dailyCheckins;
export const settings: any = selected.settings;
export const reviews: any = selected.reviews;
export const reviewReplies: any = selected.reviewReplies;
export const categories: any = selected.categories;
export const refundRequests: any = selected.refundRequests;
export const userNotifications: any = selected.userNotifications;
export const adminMessages: any = selected.adminMessages;
export const userMessages: any = selected.userMessages;
export const broadcastMessages: any = selected.broadcastMessages;
export const broadcastReads: any = selected.broadcastReads;
export const wishlistItems: any = selected.wishlistItems;
export const wishlistVotes: any = selected.wishlistVotes;
