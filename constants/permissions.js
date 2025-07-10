const defaultCrud = { view: true, add: true, edit: true, delete: true };

module.exports = {
  sales: {
    trigger: true,
    retailSale: { ...defaultCrud },
    wholeSale: { ...defaultCrud },
    transactions: { ...defaultCrud },
    quotations: { ...defaultCrud },
  },
  inventory: {
    trigger: true,
    categories: { ...defaultCrud },
    products: { ...defaultCrud },
    alertItems: { ...defaultCrud },
  },
  purchase: {
    trigger: true,
    purchase: { ...defaultCrud },
  },
  customers: {
    trigger: true,
    customers: { ...defaultCrud },
  },
  supplier: {
    trigger: true,
    supplier: { ...defaultCrud },
  },
  expense: {
    trigger: true,
    expense: { ...defaultCrud },
  },
  accounts: {
    trigger: true,
    accounts: { ...defaultCrud },
  },
  employee: {
    trigger: true,
    employee: { ...defaultCrud },
  },
  report: {
    trigger: true,
    report: { ...defaultCrud },
  },
  settings: {
    trigger: true,
    settings: { ...defaultCrud },
  },
  usersAndPermission: {
    trigger: true,
    userManagement: { ...defaultCrud },
  },
};
