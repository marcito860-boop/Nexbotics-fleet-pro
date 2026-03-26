import Book from './Book';
import Transaction from './Transaction';
import Admin from './Admin';

// Define associations
Transaction.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });
Book.hasMany(Transaction, { foreignKey: 'book_id', as: 'transactions' });

export { Book, Transaction, Admin };