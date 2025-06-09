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
import toast from 'react-hot-toast';

const NewBill: React.FC = () => {
  const navigate = useNavigate();
  const { 
    customers, 
    products,
    addCustomer,
    deleteCustomer,
    currentBill, 
    initNewBill, 
    addItemToBill, 
    updateBillItem,
    removeBillItem,
    updateBillDiscount,
    saveBill,
    clearCurrentBill
  } = useEnhancedBilling();
  
  // Local state management
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [billNote, setBillNote] = useState('');
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Determine current step based on currentBill state
  const currentStep = currentBill ? 'create-bill' : 'select-customer';
  
  useEffect(() => {
    // Cleanup function to clear current bill when leaving (only if no items)
    return () => {
      if (currentBill && (!currentBill.items || currentBill.items.length === 0)) {
        clearCurrentBill();
      }
    };
  }, [currentBill, clearCurrentBill]);
  
  const handleSelectCustomer = (customer: Customer) => {
    console.log('Selected customer:', customer);
    initNewBill(customer);
    setShowAddCustomer(false);
    toast.success(`Customer ${customer.name} selected`);
  };
  
  const handleAddCustomer = () => {
    setShowAddCustomer(true);
  };
  
  const handleSaveCustomer = async (customer: Customer) => {
    try {
      await addCustomer(customer);
      setShowAddCustomer(false);
      handleSelectCustomer(customer);
      toast.success('Customer added successfully');
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };
  
  const handleSelectProduct = (product: Product) => {
    console.log('Selected product:', product);
    setSelectedProduct(product);
    setShowProductSelection(false);
    setShowAddItem(true);
  };
  
  const handleAddItem = () => {
    console.log('Add item clicked');
    console.log('Current bill exists:', !!currentBill);
    console.log('Products available:', products.length);
    
    if (!currentBill) {
      toast.error('Please select a customer first');
      return;
    }
    
    if (products.length === 0) {
      toast.error('Please add products first');
      navigate('/products');
      return;
    }
    
    // Reset states
    setEditingItemIndex(null);
    setSelectedProduct(null);
    setShowAddItem(false);
    
    // Show product selection
    setShowProductSelection(true);
    console.log('Product selection shown');
  };
  
  const handleEditItem = (index: number) => {
    if (!currentBill || !currentBill.items) return;
    
    console.log('Editing item at index:', index);
    setEditingItemIndex(index);
    setSelectedProduct(currentBill.items[index].product);
    setShowProductSelection(false);
    setShowAddItem(true);
  };
  
  const handleDeleteItem = (index: number) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      removeBillItem(index);
      toast.success('Item removed from bill');
    }
  };
  
  const handleSaveItem = (item: BillItem) => {
    try {
      console.log('Saving item:', item);
      
      // Validate item data
      if (!item.product || !item.product.id) {
        toast.error('Invalid product data');
        return;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }
      
      if (!item.unitPrice || item.unitPrice <= 0) {
        toast.error('Unit price must be greater than 0');
        return;
      }
      
      // Ensure all required fields are present
      const completeItem: BillItem = {
        ...item,
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: item.product.id,
        subtotal: item.subtotal || (item.quantity * item.unitPrice),
        total: item.total || (item.subtotal - (item.discountAmount || 0)),
        discountAmount: item.discountAmount || 0,
        taxAmount: item.taxAmount || 0,
        discountType: item.discountType || 'fixed',
        discountValue: item.discountValue || 0,
        discountPercentage: item.discountPercentage || 0,
        taxRate: item.taxRate || 0
      };
      
      if (editingItemIndex !== null) {
        updateBillItem(editingItemIndex, completeItem);
        toast.success('Item updated successfully');
      } else {
        addItemToBill(completeItem);
        toast.success('Item added to bill');
      }
      
      // Reset form states - IMPORTANT: Don't clear currentBill
      setShowAddItem(false);
      setShowProductSelection(false);
      setSelectedProduct(null);
      setEditingItemIndex(null);
      
      console.log('Item saved successfully, staying on bill page');
      
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleCancelItemForm = () => {
    console.log('Canceling item form');
    setShowAddItem(false);
    setShowProductSelection(false);
    setSelectedProduct(null);
    setEditingItemIndex(null);
  };

  const handleBillDiscountChange = (discountType: 'fixed' | 'percentage', discountValue: number) => {
    updateBillDiscount(discountType, discountValue);
  };
  
  const handleFinalizeBill = async () => {
    if (!currentBill) {
      toast.error('No bill to save');
      return;
    }
    
    if (!currentBill.items || currentBill.items.length === 0) {
      toast.error('Please add at least one item to the bill');
      return;
    }
    
    // Validate all items have required data
    const invalidItems = currentBill.items.filter(item => 
      !item.product || !item.product.id || !item.quantity || !item.unitPrice
    );
    
    if (invalidItems.length > 0) {
      toast.error('Some items have invalid data. Please check all items.');
      return;
    }
    
    try {
      setIsSaving(true);
      console.log('Saving bill with items:', currentBill.items);
      
      await saveBill(billNote.trim() || undefined);
      toast.success('Bill saved successfully');
      navigate('/bill-history');
      
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save bill');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this bill? All unsaved changes will be lost.')) {
      clearCurrentBill();
      navigate('/');
    }
  };

  const getItemDiscountsTotal = (): number => {
    if (!currentBill || !currentBill.items) return 0;
    return currentBill.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  };
  
  // Customer Selection Step
  if (currentStep === 'select-customer') {
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
          <>
            {customers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No customers available
                </h3>
                <p className="text-gray-500 mb-6">
                  You need to add a customer before creating a bill.
                </p>
                <button
                  onClick={handleAddCustomer}
                  className="btn btn-primary flex items-center justify-center space-x-2"
                >
                  <UserPlus size={18} />
                  <span>Add Your First Customer</span>
                </button>
              </div>
            ) : (
              <CustomersList
                customers={customers}
                onEdit={() => {}} // Disable edit in bill creation
                onDelete={handleDeleteCustomer}
                onSelect={handleSelectCustomer}
                selectable
              />
            )}
          </>
        )}
      </div>
    );
  }
  
  // Bill Creation Step
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Customer:</h3>
            {currentBill && (
              <div className="mt-1">
                <p className="font-medium text-gray-900">{currentBill.customer.name}</p>
                <p className="text-sm text-gray-500">{currentBill.customer.phone}</p>
                {currentBill.customer.email && (
                  <p className="text-sm text-gray-500">{currentBill.customer.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bill Items */}
      <div className="card">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <h2 className="text-lg font-medium text-gray-900">
            Items ({currentBill?.items?.length || 0})
          </h2>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAddItem}
              className="btn btn-primary flex items-center space-x-2"
              disabled={products.length === 0}
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {/* Product Selection Modal */}
          {showProductSelection && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Product</h3>
                <button
                  onClick={() => setShowProductSelection(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  title="Close"
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

          {/* Item Form Modal */}
          {showAddItem && selectedProduct && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border-2 border-blue-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingItemIndex !== null ? 'Edit Item' : 'Add Item to Bill'}
                </h3>
                <button
                  onClick={handleCancelItemForm}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  title="Close"
                >
                  ×
                </button>
              </div>
              
              <BillItemForm
                product={selectedProduct}
                existingItem={
                  editingItemIndex !== null && currentBill && currentBill.items
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
            <>
              {currentBill.items && currentBill.items.length > 0 ? (
                <BillItemsTable
                  items={currentBill.items}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500 mb-4">No items added to this bill yet.</p>
                  <button
                    onClick={handleAddItem}
                    className="btn btn-primary flex items-center justify-center space-x-2"
                    disabled={products.length === 0}
                  >
                    <Plus size={18} />
                    <span>Add Your First Item</span>
                  </button>
                  {products.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      You need to add products first
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {currentBill && currentBill.items && currentBill.items.length > 0 && (
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
          disabled={isSaving}
        >
          <ArrowLeft size={18} />
          <span>Cancel</span>
        </button>
        
        <button
          onClick={handleFinalizeBill}
          className="btn btn-primary flex items-center space-x-2"
          disabled={!currentBill || !currentBill.items || currentBill.items.length === 0 || isSaving}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <FileCheck size={18} />
          )}
          <span>{isSaving ? 'Saving...' : 'Finalize Bill'}</span>
        </button>
      </div>
    </div>
  );
};

export default NewBill;