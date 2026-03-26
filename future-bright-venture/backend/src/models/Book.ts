import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BookAttributes {
  id: number;
  title: string;
  author: string;
  description: string;
  price: number;
  coverImage: string;
  filePath: string;
  featured: boolean;
  category: string;
  pages: number;
  language: string;
  publishedYear: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BookCreationAttributes extends Optional<BookAttributes, 'id' | 'createdAt' | 'updatedAt' | 'featured'> {}

class Book extends Model<BookAttributes, BookCreationAttributes> implements BookAttributes {
  public id!: number;
  public title!: string;
  public author!: string;
  public description!: string;
  public price!: number;
  public coverImage!: string;
  public filePath!: string;
  public featured!: boolean;
  public category!: string;
  public pages!: number;
  public language!: string;
  public publishedYear!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Book.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    coverImage: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: 'General'
    },
    pages: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    language: {
      type: DataTypes.STRING(50),
      defaultValue: 'English'
    },
    publishedYear: {
      type: DataTypes.INTEGER,
      defaultValue: new Date().getFullYear()
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'books',
    timestamps: true
  }
);

export default Book;