// Core types for the FinancialAdvisor system
export var AccountType;
(function (AccountType) {
    AccountType["CHECKING"] = "checking";
    AccountType["SAVINGS"] = "savings";
    AccountType["CREDIT_CARD"] = "credit_card";
    AccountType["INVESTMENT"] = "investment";
    AccountType["LOAN"] = "loan";
    AccountType["MORTGAGE"] = "mortgage";
    AccountType["RETIREMENT"] = "retirement";
})(AccountType || (AccountType = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["INCOME"] = "income";
    TransactionType["EXPENSE"] = "expense";
    TransactionType["TRANSFER"] = "transfer";
})(TransactionType || (TransactionType = {}));
export var BudgetPeriod;
(function (BudgetPeriod) {
    BudgetPeriod["WEEKLY"] = "weekly";
    BudgetPeriod["MONTHLY"] = "monthly";
    BudgetPeriod["QUARTERLY"] = "quarterly";
    BudgetPeriod["YEARLY"] = "yearly";
})(BudgetPeriod || (BudgetPeriod = {}));
export var GoalCategory;
(function (GoalCategory) {
    GoalCategory["EMERGENCY_FUND"] = "emergency_fund";
    GoalCategory["VACATION"] = "vacation";
    GoalCategory["HOME_PURCHASE"] = "home_purchase";
    GoalCategory["DEBT_PAYOFF"] = "debt_payoff";
    GoalCategory["RETIREMENT"] = "retirement";
    GoalCategory["EDUCATION"] = "education";
    GoalCategory["OTHER"] = "other";
})(GoalCategory || (GoalCategory = {}));
export var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (Priority = {}));
export var AIProviderType;
(function (AIProviderType) {
    AIProviderType["OPENAI"] = "openai";
    AIProviderType["ANTHROPIC"] = "anthropic";
    AIProviderType["OLLAMA"] = "ollama";
    AIProviderType["COPILOT"] = "copilot";
    AIProviderType["CUSTOM"] = "custom";
})(AIProviderType || (AIProviderType = {}));
export var QueryType;
(function (QueryType) {
    QueryType["ANALYSIS"] = "analysis";
    QueryType["ADVICE"] = "advice";
    QueryType["CATEGORIZATION"] = "categorization";
    QueryType["PREDICTION"] = "prediction";
    QueryType["REPORT"] = "report";
})(QueryType || (QueryType = {}));
export var ReportType;
(function (ReportType) {
    ReportType["MONTHLY_SUMMARY"] = "monthly_summary";
    ReportType["SPENDING_ANALYSIS"] = "spending_analysis";
    ReportType["INVESTMENT_PERFORMANCE"] = "investment_performance";
    ReportType["BUDGET_REVIEW"] = "budget_review";
    ReportType["GOAL_PROGRESS"] = "goal_progress";
    ReportType["NET_WORTH_TREND"] = "net_worth_trend";
})(ReportType || (ReportType = {}));
export var ReportFormat;
(function (ReportFormat) {
    ReportFormat["MARKDOWN"] = "markdown";
    ReportFormat["HTML"] = "html";
    ReportFormat["PDF"] = "pdf";
    ReportFormat["JSON"] = "json";
})(ReportFormat || (ReportFormat = {}));
