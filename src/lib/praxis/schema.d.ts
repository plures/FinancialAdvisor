/**
 * Praxis Schema for Financial Advisor
 *
 * This schema defines the application logic, data models, and business rules
 * using the Praxis framework.
 */
export declare const financialAdvisorSchema: {
    name: string;
    version: string;
    models: {
        Account: {
            fields: {
                id: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                name: {
                    type: string;
                    required: boolean;
                };
                type: {
                    type: string;
                    values: string[];
                    required: boolean;
                };
                balance: {
                    type: string;
                    required: boolean;
                };
                currency: {
                    type: string;
                    default: string;
                };
                institution: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
                createdAt: {
                    type: string;
                    default: string;
                };
                updatedAt: {
                    type: string;
                    default: string;
                };
            };
            indexes: string[];
        };
        Transaction: {
            fields: {
                id: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                accountId: {
                    type: string;
                    required: boolean;
                    ref: string;
                };
                amount: {
                    type: string;
                    required: boolean;
                };
                description: {
                    type: string;
                    required: boolean;
                };
                category: {
                    type: string;
                };
                date: {
                    type: string;
                    required: boolean;
                };
                type: {
                    type: string;
                    values: string[];
                    required: boolean;
                };
                tags: {
                    type: string;
                    items: string;
                };
                createdAt: {
                    type: string;
                    default: string;
                };
            };
            indexes: string[];
        };
        Budget: {
            fields: {
                id: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                name: {
                    type: string;
                    required: boolean;
                };
                category: {
                    type: string;
                    required: boolean;
                };
                amount: {
                    type: string;
                    required: boolean;
                };
                period: {
                    type: string;
                    values: string[];
                    required: boolean;
                };
                startDate: {
                    type: string;
                    required: boolean;
                };
                endDate: {
                    type: string;
                };
                isActive: {
                    type: string;
                    default: boolean;
                };
            };
            indexes: string[];
        };
        Goal: {
            fields: {
                id: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                name: {
                    type: string;
                    required: boolean;
                };
                targetAmount: {
                    type: string;
                    required: boolean;
                };
                currentAmount: {
                    type: string;
                    default: number;
                };
                deadline: {
                    type: string;
                };
                category: {
                    type: string;
                };
                isCompleted: {
                    type: string;
                    default: boolean;
                };
                createdAt: {
                    type: string;
                    default: string;
                };
            };
            indexes: string[];
        };
    };
    rules: {
        accountBalanceValid: {
            when: string;
            condition: (account: any) => boolean;
            message: string;
        };
        transactionAmountPositive: {
            when: string;
            condition: (transaction: any) => boolean;
            message: string;
        };
        budgetAmountPositive: {
            when: string;
            condition: (budget: any) => boolean;
            message: string;
        };
    };
    events: {
        accountCreated: {
            model: string;
            action: string;
        };
        accountUpdated: {
            model: string;
            action: string;
        };
        transactionAdded: {
            model: string;
            action: string;
        };
        budgetExceeded: {
            custom: boolean;
        };
        goalAchieved: {
            custom: boolean;
        };
    };
};
export type Account = {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'retirement';
    balance: number;
    currency?: string;
    institution?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
export type Transaction = {
    id: string;
    accountId: string;
    amount: number;
    description: string;
    category?: string;
    date: Date;
    type: 'debit' | 'credit';
    tags?: string[];
    createdAt?: Date;
};
export type Budget = {
    id: string;
    name: string;
    category: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    isActive?: boolean;
};
export type Goal = {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: Date;
    category?: string;
    isCompleted?: boolean;
    createdAt?: Date;
};
//# sourceMappingURL=schema.d.ts.map