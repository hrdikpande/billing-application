import React, { useState } from 'react';
import { Pencil, Trash2, Search, User } from 'lucide-react';
import { Customer } from '../types';
import { formatDate } from '../utils/calculations';

interface CustomersListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onSelect?: (customer: Customer) => void;
  selectable?: boolean;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  onEdit,
  onDelete,
  onSelect,
  selectable = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

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
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCustomers.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                    <User size={24} className="text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                    {customer.email && (
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Added on {formatDate(customer.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {selectable && (
                    <button
                      onClick={() => onSelect && onSelect(customer)}
                      className="btn btn-primary px-3 py-1 text-xs"
                    >
                      Select
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(customer)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(customer.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          {searchTerm
            ? 'No customers match your search'
            : 'No customers available'}
        </div>
      )}
    </div>
  );
};

export default CustomersList;