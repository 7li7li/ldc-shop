import {
    boolean,
    customType,
    decimal,
    double,
    index,
    int,
    mysqlTable,
    text,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/mysql-core';

const timestampMs = customType<{ data: Date; driverData: number | string }>({
    dataType: () => 'bigint',
    toDriver: (value) => value instanceof Date ? value.getTime() : Number(value),
    fromDriver: (value) => new Date(Number(value)),
});

export const products = mysqlTable('products', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 18, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 18, scale: 2 }),
    category: varchar('category', { length: 255 }),
    image: text('image'),
    productImages: text('product_images'),
    isHot: boolean('is_hot').default(false),
    isActive: boolean('is_active').default(true),
    isShared: boolean('is_shared').default(false),
    sortOrder: int('sort_order').default(0),
    purchaseLimit: int('purchase_limit'),
    purchaseWarning: text('purchase_warning'),
    purchaseUrl: text('purchase_url'),
    visibilityLevel: int('visibility_level').default(-1),
    stockCount: int('stock_count').default(0),
    lockedCount: int('locked_count').default(0),
    soldCount: int('sold_count').default(0),
    rating: double('rating').default(0),
    reviewCount: int('review_count').default(0),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
    variantGroupId: varchar('variant_group_id', { length: 255 }),
    variantLabel: varchar('variant_label', { length: 255 }),
    purchaseQuestions: text('purchase_questions'),
}, (table) => ({
    activeSortIndex: index('products_active_sort_idx').on(table.isActive, table.sortOrder, table.createdAt),
    stockCountIndex: index('products_stock_count_idx').on(table.stockCount),
    soldCountIndex: index('products_sold_count_idx').on(table.soldCount),
}));

export const cards = mysqlTable('cards', {
    id: int('id').autoincrement().primaryKey(),
    productId: varchar('product_id', { length: 255 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
    cardKey: text('card_key').notNull(),
    isUsed: boolean('is_used').default(false),
    reservedOrderId: varchar('reserved_order_id', { length: 255 }),
    reservedAt: timestampMs('reserved_at'),
    expiresAt: timestampMs('expires_at'),
    usedAt: timestampMs('used_at'),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    productUsedReservedIndex: index('cards_product_used_reserved_idx').on(table.productId, table.isUsed, table.reservedAt),
    reservedOrderIndex: index('cards_reserved_order_idx').on(table.reservedOrderId),
    expiresAtIndex: index('cards_expires_at_idx').on(table.expiresAt),
}));

export const orders = mysqlTable('orders', {
    orderId: varchar('order_id', { length: 255 }).primaryKey(),
    productId: varchar('product_id', { length: 255 }).notNull(),
    productName: varchar('product_name', { length: 500 }).notNull(),
    amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
    email: varchar('email', { length: 500 }),
    status: varchar('status', { length: 32 }).default('pending'),
    tradeNo: varchar('trade_no', { length: 255 }),
    cardKey: text('card_key'),
    cardIds: text('card_ids'),
    paidAt: timestampMs('paid_at'),
    deliveredAt: timestampMs('delivered_at'),
    userId: varchar('user_id', { length: 255 }),
    username: varchar('username', { length: 255 }),
    payee: varchar('payee', { length: 255 }),
    pointsUsed: int('points_used').default(0),
    quantity: int('quantity').default(1).notNull(),
    currentPaymentId: varchar('current_payment_id', { length: 255 }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    statusPaidAtIndex: index('orders_status_paid_at_idx').on(table.status, table.paidAt),
    statusCreatedAtIndex: index('orders_status_created_at_idx').on(table.status, table.createdAt),
    userStatusCreatedAtIndex: index('orders_user_status_created_at_idx').on(table.userId, table.status, table.createdAt),
    productStatusIndex: index('orders_product_status_idx').on(table.productId, table.status),
}));

export const loginUsers = mysqlTable('login_users', {
    userId: varchar('user_id', { length: 255 }).primaryKey(),
    username: varchar('username', { length: 255 }),
    email: varchar('email', { length: 500 }),
    points: int('points').default(0).notNull(),
    isBlocked: boolean('is_blocked').default(false),
    desktopNotificationsEnabled: boolean('desktop_notifications_enabled').default(false),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
    lastLoginAt: timestampMs('last_login_at').$defaultFn(() => new Date()),
    lastCheckinAt: timestampMs('last_checkin_at'),
    consecutiveDays: int('consecutive_days').default(0),
}, (table) => ({
    lastLoginAtIndex: index('login_users_last_login_at_idx').on(table.lastLoginAt),
}));

export const dailyCheckins = mysqlTable('daily_checkins_v2', {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull().references(() => loginUsers.userId, { onDelete: 'cascade' }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    userCreatedAtIndex: index('daily_checkins_user_created_idx').on(table.userId, table.createdAt),
}));

export const settings = mysqlTable('settings', {
    key: varchar('key', { length: 191 }).primaryKey(),
    value: text('value'),
    updatedAt: timestampMs('updated_at').$defaultFn(() => new Date()),
});

export const reviews = mysqlTable('reviews', {
    id: int('id').autoincrement().primaryKey(),
    productId: varchar('product_id', { length: 255 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
    rating: int('rating').notNull(),
    comment: text('comment'),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    productCreatedAtIndex: index('reviews_product_created_at_idx').on(table.productId, table.createdAt),
}));

export const reviewReplies = mysqlTable('review_replies', {
    id: int('id').autoincrement().primaryKey(),
    reviewId: int('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
    comment: text('comment').notNull(),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    reviewCreatedAtIndex: index('review_replies_review_created_idx').on(table.reviewId, table.createdAt),
}));

export const categories = mysqlTable('categories', {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    icon: text('icon'),
    sortOrder: int('sort_order').default(0),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at').$defaultFn(() => new Date()),
}, (table) => ({ nameUnique: uniqueIndex('categories_name_uq').on(table.name) }));

export const refundRequests = mysqlTable('refund_requests', {
    id: int('id').autoincrement().primaryKey(),
    orderId: varchar('order_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }),
    username: varchar('username', { length: 255 }),
    reason: text('reason'),
    status: varchar('status', { length: 32 }).default('pending'),
    adminUsername: varchar('admin_username', { length: 255 }),
    adminNote: text('admin_note'),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at').$defaultFn(() => new Date()),
    processedAt: timestampMs('processed_at'),
}, (table) => ({
    orderIdIndex: index('refund_requests_order_id_idx').on(table.orderId),
}));

export const userNotifications = mysqlTable('user_notifications', {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull().references(() => loginUsers.userId, { onDelete: 'cascade' }),
    type: varchar('type', { length: 64 }).notNull(),
    titleKey: varchar('title_key', { length: 255 }).notNull(),
    contentKey: varchar('content_key', { length: 255 }).notNull(),
    data: text('data'),
    isRead: boolean('is_read').default(false),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    userCreatedAtIndex: index('user_notifications_user_created_idx').on(table.userId, table.createdAt),
    userReadIndex: index('user_notifications_user_read_idx').on(table.userId, table.isRead, table.createdAt),
}));

export const adminMessages = mysqlTable('admin_messages', {
    id: int('id').autoincrement().primaryKey(),
    targetType: varchar('target_type', { length: 64 }).notNull(),
    targetValue: varchar('target_value', { length: 500 }),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body').notNull(),
    sender: varchar('sender', { length: 255 }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    createdAtIndex: index('admin_messages_created_idx').on(table.createdAt),
}));

export const userMessages = mysqlTable('user_messages', {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull().references(() => loginUsers.userId, { onDelete: 'cascade' }),
    username: varchar('username', { length: 255 }),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body').notNull(),
    isRead: boolean('is_read').default(false),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    readCreatedAtIndex: index('user_messages_read_created_idx').on(table.isRead, table.createdAt),
    userCreatedAtIndex: index('user_messages_user_created_idx').on(table.userId, table.createdAt),
}));

export const broadcastMessages = mysqlTable('broadcast_messages', {
    id: int('id').autoincrement().primaryKey(),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body').notNull(),
    sender: varchar('sender', { length: 255 }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    createdAtIndex: index('broadcast_messages_created_idx').on(table.createdAt),
}));

export const broadcastReads = mysqlTable('broadcast_reads', {
    id: int('id').autoincrement().primaryKey(),
    messageId: int('message_id').notNull().references(() => broadcastMessages.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull().references(() => loginUsers.userId, { onDelete: 'cascade' }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    messageUserUnique: uniqueIndex('broadcast_reads_message_user_uq').on(table.messageId, table.userId),
    userCreatedAtIndex: index('broadcast_reads_user_idx').on(table.userId, table.createdAt),
}));

export const wishlistItems = mysqlTable('wishlist_items', {
    id: int('id').autoincrement().primaryKey(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    userId: varchar('user_id', { length: 255 }),
    username: varchar('username', { length: 255 }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    createdAtIndex: index('wishlist_items_created_idx').on(table.createdAt),
}));

export const wishlistVotes = mysqlTable('wishlist_votes', {
    id: int('id').autoincrement().primaryKey(),
    itemId: int('item_id').notNull().references(() => wishlistItems.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull().references(() => loginUsers.userId, { onDelete: 'cascade' }),
    createdAt: timestampMs('created_at').$defaultFn(() => new Date()),
}, (table) => ({
    itemUserUnique: uniqueIndex('wishlist_votes_item_user_uq').on(table.itemId, table.userId),
    itemCreatedAtIndex: index('wishlist_votes_item_idx').on(table.itemId, table.createdAt),
}));
