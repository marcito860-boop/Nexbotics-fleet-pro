import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TransactionAttributes {
  id: number;
  book_id: number;
  payment_method: 'mpesa' | 'paypal' | 'stripe';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  phone: string | null;
  email: string | null;
  download_token: string;
  expires_at: Date;
  payment_reference: string | null;
  created_at: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'created_at' | 'phone' | 'email' | 'payment_reference'> {}

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: number;
  public book_id!: number;
  public payment_method!: 'mpesa' | 'paypal' | 'stripe';
  public amount!: number;
  public status!: 'pending' | 'completed' | 'failed';
  public phone!: string | null;
  public email!: string | null;
  public download_token!: string;
  public expires_at!: Date;
  public payment_reference!: string | null;
  public readonly created_at!: Date;
}

Transaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'books',
        key: 'id'
      }
    },
    payment_method: {
      type: DataTypes.ENUM('mpesa', 'paypal', 'stripe'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    download_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default Transaction;