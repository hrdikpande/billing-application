import React, { useState } from 'react';
import { useEnhancedBilling } from '../context/EnhancedBillingContext';
import { Plus } from 'lucide-react';
import CustomersList from '../components/CustomersList';
import CustomerForm from '../components/CustomerForm';
import { Customer } from '../types';

const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useEnhancedBilling();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const handleAdd = () => {
    setEditingCustomer(null);
    setShowAddForm(true);
  };
  
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
    }
  };
  
  const handleSave = async (customer: Customer) => {
    if (editingCustomer) {
      await updateCustomer(customer);
    } else {
      await addCustomer(customer);
    }
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage your customer database securely</p>
        </div>
        
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Customer</span>
        </button>
      </div>
      
      {showAddForm && (
        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <CustomerForm
            customer={editingCustomer || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowAddForm(false);
              setEditingCustomer(null);
            }}
          />
        </div>
      )}
      
      {customers.length === 0 && !showAddForm ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No customers available
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by adding your first customer.
          </p>
          <button
            onClick={handleAdd}
            className="btn btn-primary flex items-center justify-center space-x-2"
          >
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        </div>
      ) : (
        !showAddForm && (
          <CustomersList
            customers={customers}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )
      )}
    </div>
  );
};

export default Customers;