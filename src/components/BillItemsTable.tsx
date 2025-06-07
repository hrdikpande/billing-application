import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { BillItem } from '../types';
import { formatCurrency } from '../utils/calculations';

interface BillItemsTableProps {
  items: BillItem[];
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
  readOnly?: boolean;
}

const BillItemsTable: React.FC<BillItemsTableProps> = ({
  items,
  onEdit,
  onDelete,
  readOnly = false,
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No items added to this bill yet.</p>
      </div>
    );
  }

  return (
    <div className="table-container rounded-md overflow-hidden border border-gray-200">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Product</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Discount</th>
            <th>Subtotal</th>
            <th>Total</th>
            {!readOnly && <th className="w-20">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item, index) => (
            <tr key={index} className="table-row">
              <td>{index + 1}</td>
              <td>
                <div>
                  <div className="font-medium text-gray-900">
                    {item.product.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Code: {item.product.code}
                  </div>
                </div>
              </td>
              <td>{formatCurrency(item.product.price)}</td>
              <td>{item.quantity}</td>
              <td>
                {item.discountType === 'fixed'
                  ? formatCurrency(item.discountValue)
                  : `${item.discountValue}%`}
              </td>
              <td>{formatCurrency(item.subtotal)}</td>
              <td className="font-medium text-gray-900">
                {formatCurrency(item.total)}
              </td>
              {!readOnly && (
                <td>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit && onEdit(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillItemsTable;