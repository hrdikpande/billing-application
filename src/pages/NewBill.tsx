import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedBilling } from '../context/EnhancedBillingContext';
import { Plus, UserPlus, FileCheck, ArrowLeft, Percent } from 'lucide-react';
import CustomersList from '../components/CustomersList';
import CustomerForm from '../components/CustomerForm';
import ProductsTable from '../components/ProductsTable';
import BillItemForm from '../components/BillItemForm';
import BillItemsTable from '../components/BillItemsTable';
import BillDiscountForm from '../components/BillDiscountForm';
import { Customer, Product, BillItem } from '../types';
import { formatCurrency } from '../utils/calculations';

const NewBill: React.FC = () => {
  const navigate = useNavigate();
  const { 
    customers, 
    products,
    addCustomer,
    currentBill, 
    initNewBill, 
    addItemToBill, 
    updateBillItem,
    removeBillItem,
    updateBillDiscount,
    saveBill 
  } = useEnhancedBilling();
  
  const [step, setStep] = useState<'select-customer' | 'create-bill'>('select-customer');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [billNote, setBillNote] = useState('');
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  
  useEffect(() => {
    // Reset the current bill when component mounts
    if (currentBill) {
      setStep('create-bill');
    }
  }, [currentBill]);
  
  const handleSelectCustomer = (customer: Customer) => {
    initNewBill(customer);
    setStep('create-bill');
  };
  
  const handleAddCustomer = () => {
    setShowAddCustomer(true);
  };
  
  const handleSaveCustomer = async (customer: Customer) => {
    await addCustomer(customer);
    setShowAddCustomer(false);
    handleSelectCustomer(customer);
  };
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductSelection(false);
    setShowAddItem(true);
  };
  
  const handleAddItem = () => {
    setEditingItemIndex(null);
    setSelectedProduct(null);
    setShowAddItem(false);
    setShowProductSelection(true);
  };
  
  const handleEditItem = (index: number) => {
    if (!currentBill) return;
    setEditingItemIndex(index);
    setSelectedProduct(currentBill.items[index].product);
    setShowProductSelection(false);
    setShowAddItem(true);
  };
  
  const handleDeleteItem = (index: number) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      removeBillItem(index);
    }
  };
  
  const handleSaveItem = (item: BillItem) => {
    if (editingItemIndex !== null) {
      updateBillItem(editingItemIndex, item);
    } else {
      addItemToBill(item);
    }
    setShowAddItem(false);
    setShowProductSelection(false);
    setSelectedProduct(null);
    setEditingItemIndex(null);
  };

  const handleCancelItemForm = () => {
    setShowAddItem(false);
    setShowProductSelection(false);
    setSelectedProduct(null);
    setEditingItemIndex(null);
  };

  const handleBillDiscountChange = (discountType: 'fixed' | 'percentage', discountValue: number) => {
    updateBillDiscount(discountType, discountValue);
  };
  
  const handleFinalizeBill = async () => {
    if (!currentBill || currentBill.items.length === 0) {
      return;
    }
    
    await saveBill(billNote.trim() || undefined);
    navigate('/bill-history');
  };
  
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this bill? All unsaved changes will be lost.')) {
      navigate('/');
    }
  };

  const getItemDiscountsTotal = (): number => {
    if (!currentBill) return 0;
    return currentBill.items.reduce((sum, item) => sum + item.discountAmount, 0);
  };
  
  // If we're still at the customer selection step
  if (step === 'select-customer') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Select Customer</h1>
            <p className="text-sm text-gray-500">Choose a customer to create a new bill</p>
          </div>
          
          <button
            onClick={handleAddCustomer}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus size={18} />
            <span>Add New Customer</span>
          </button>
        </div>
        
        {showAddCustomer ? (
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Add New Customer
            </h2>
            <CustomerForm
              onSave={handleSaveCustomer}
              onCancel={() => setShowAddCustomer(false)}
            />
          </div>
        ) : (
          <CustomersList
            customers={customers}
            onEdit={() => {}}
            onDelete={() => {}}
            onSelect={handleSelectCustomer}
            selectable
          />
        )}
      </div>
    );
  }
  
  // If we're at the bill creation step
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bill Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Bill</h1>
            {currentBill && (
              <p className="text-gray-500">Bill #: {currentBill.billNumber}</p>
            )}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Customer:</h3>
            {currentBill && (
              <div className="mt-1">
                <p className="font-medium text-gray-900">{currentBill.customer.name}</p>
                <p className="text-sm text-gray-500">{currentBill.customer.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bill Items */}
      <div className="card">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <h2 className="text-lg font-medium text-gray-900">Bill Items</h2>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAddItem}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {/* Product Selection */}
          {showProductSelection && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Product</h3>
                <button
                  onClick={() => setShowProductSelection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {products.length > 0 ? (
                <ProductsTable
                  products={products}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onSelect={handleSelectProduct}
                  selectable
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No products available</p>
                  <button
                    onClick={() => navigate('/products')}
                    className="btn btn-primary"
                  >
                    Add Products First
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Item Form */}
          {showAddItem && selectedProduct && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItemIndex !== null ? 'Edit Item' : 'Add Item to Bill'}
              </h3>
              
              <BillItemForm
                product={selectedProduct}
                existingItem={
                  editingItemIndex !== null && currentBill
                    ? currentBill.items[editingItemIndex]
                    : undefined
                }
                onSave={handleSaveItem}
                onCancel={handleCancelItemForm}
              />
            </div>
          )}
          
          {/* Bill Items Table */}
          {currentBill && (
            <BillItemsTable
              items={currentBill.items}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          )}
        </div>
        
        {currentBill && currentBill.items.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bill Discount Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Bill Discount</h3>
                  <button
                    onClick={() => setShowBillDiscount(!showBillDiscount)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Percent size={14} />
                    <span>{showBillDiscount ? 'Hide' : 'Add'} Discount</span>
                  </button>
                </div>
                
                {showBillDiscount && (
                  <BillDiscountForm
                    discountType={currentBill.billDiscountType || 'fixed'}
                    discountValue={currentBill.billDiscountValue || 0}
                    subtotal={currentBill.subtotal}
                    itemDiscounts={getItemDiscountsTotal()}
                    onDiscountChange={handleBillDiscountChange}
                  />
                )}
              </div>

              {/* Bill Summary */}
              <div className="flex justify-end">
                <div className="w-full sm:w-64">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(currentBill.subtotal)}
                      </span>
                    </div>
                    
                    {getItemDiscountsTotal() > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item Discounts:</span>
                        <span className="font-medium text-orange-600">
                          -{formatCurrency(getItemDiscountsTotal())}
                        </span>
                      </div>
                    )}
                    
                    {(currentBill.billDiscountAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bill Discount:</span>
                        <span className="font-medium text-green-600">
                          -{formatCurrency(currentBill.billDiscountAmount || 0)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium">
                        -{formatCurrency(currentBill.totalDiscount)}
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200 flex justify-between">
                      <span className="font-medium text-gray-900">Total:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(currentBill.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bill Note */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Note</h3>
        <textarea
          value={billNote}
          onChange={(e) => setBillNote(e.target.value)}
          className="input w-full h-24"
          placeholder="Add any additional notes or comments here..."
        ></textarea>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={handleCancel}
          className="btn btn-outline flex items-center space-x-2"
        >
          <ArrowLeft size={18} />
          <span>Cancel</span>
        </button>
        
        <button
          onClick={handleFinalizeBill}
          className="btn btn-primary flex items-center space-x-2"
          disabled={!currentBill || currentBill.items.length === 0}
        >
          <FileCheck size={18} />
          <span>Finalize Bill</span>
        </button>
      </div>
    </div>
  );
};

export default NewBill;