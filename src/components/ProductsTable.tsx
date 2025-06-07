import React, { useState } from 'react';
import { Pencil, Trash2, Search } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/calculations';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSelect?: (product: Product) => void;
  selectable?: boolean;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEdit,
  onDelete,
  onSelect,
  selectable = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort products by serial number to ensure proper display order
  const sortedProducts = filteredProducts.sort((a, b) => (a.sno || 0) - (b.sno || 0));

  return (
    <div className="card animate-fade-in">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search products by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Code</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedProducts.length > 0 ? (
              sortedProducts.map((product) => (
                <tr key={product.id} className="table-row">
                  <td className="font-medium text-gray-900">{product.sno || 0}</td>
                  <td className="font-medium text-gray-700">{product.name}</td>
                  <td>{product.code}</td>
                  <td>{formatCurrency(product.unitPrice || product.price || 0)}</td>
                  <td>
                    <div className="flex space-x-2">
                      {selectable && (
                        <button
                          onClick={() => onSelect && onSelect(product)}
                          className="btn btn-primary px-3 py-1 text-xs"
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm
                    ? 'No products match your search'
                    : 'No products available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTable;