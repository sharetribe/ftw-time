import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { arrayOf, bool, number, shape, string, func, array } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';
import { propTypes } from '../../util/types';
import { ensureCurrentUser, cutTextToPreview } from '../../util/data';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/UI.duck';
import { changeModalValue } from '../TopbarContainer/TopbarContainer.duck';
import { setCurrentTransaction } from '../../ducks/transactions.duck';
import {
  fetchMoreMessages,
  sendMessage,
  clearMessages,
  fetchOtherUserListing,
  updateViewedMessages,
  updateViewedNotifications,
  transitionToRequestPayment,
} from './InboxPage.duck';
import { fetchTransaction } from '../../ducks/transactions.duck';
import {
  NotificationBadge,
  Page,
  PaginationLinks,
  LinkTabNavHorizontal,
  LayoutSideNavigation,
  LayoutWrapperMain,
  LayoutWrapperSideNav,
  LayoutWrapperTopbar,
  LayoutWrapperFooter,
  Footer,
  IconSpinner,
  MessagePanel,
  InboxItem,
  MessagesInboxSideList,
  NotificationsInboxSideList,
} from '../../components';
import { TopbarContainer, NotFoundPage } from '..';
import config from '../../config';
import StripePaymentModal from '../StripePaymentModal/StripePaymentModal';

import { getCurrentTransaction } from './InboxPage.helpers';
import css from './InboxPage.module.css';

const objectsEqual = (o1, o2) =>
  o1 && o2 && typeof o1 === 'object' && Object.keys(o1).length > 0
    ? Object.keys(o1).length === Object.keys(o2).length &&
      Object.keys(o1).every(p => objectsEqual(o1[p], o2[p]))
    : o1 === o2;

const arraysEqual = (a1, a2) =>
  a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));

export const InboxPageComponent = props => {
  const {
    unitType,
    currentUser,
    currentUserListing,
    fetchTransactionsInProgress,
    fetchTransactionsError,
    intl,
    pagination,
    params,
    notificationCount,
    scrollingDisabled,
    currentTransactions,
    onChangeMissingInfoModal,
    history,
    fetchMessagesInProgress,
    totalMessagePages,
    messages,
    oldestMessagePageFetched,
    initialMessageFailedToTransaction,
    fetchMessagesError,
    sendMessageInProgress,
    sendMessageError,
    onShowMoreMessages,
    transactionRole,
    onClearMessages,
    onSendMessage,
    onFetchOtherUserListing,
    otherUserListing,
    onManageDisableScrolling,
    onFetchTransaction,
    onSetCurrentTransaction,
    onUpdateViewedMessages,
    updateViewedMessagesInProgress,
    fetchCurrentUserNotificationsInProgress,
    fetchCurrentUserNotificationsError,
    onUpdateViewedNotifications,
    updateViewedNotificationsSuccess,
    updateViewedNotificationsInProgress,
    updateViewedNotificationsError,
    onTransitionToRequestPayment,
    transitionToRequestPaymentInProgress,
    transitionToRequestPaymentError,
    transitionToRequestPaymentSuccess,
  } = props;
  const { tab } = params;
  const ensuredCurrentUser = ensureCurrentUser(currentUser);

  const currentTxId = queryString.parse(history.location.search).id;

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!arraysEqual(currentTransactions, transactions)) {
      setTransactions(currentTransactions);
    }
  }, [currentTransactions]);

  let currentTransaction = null;

  currentTransaction = useMemo(() => {
    if (transactions) {
      return getCurrentTransaction(transactions, history.location.search);
    }
  }, [transactions, history.location.search]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const onClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const onOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const validTab = tab === 'messages' || tab === 'notifications';
  if (!validTab) {
    return <NotFoundPage />;
  }

  const isMessages = tab === 'messages';

  const messagesTitle = intl.formatMessage({ id: 'InboxPage.messagesTitle' });
  const notificationsTitle = intl.formatMessage({ id: 'InboxPage.notificationsTitle' });
  const title = isMessages ? messagesTitle : notificationsTitle;

  const error = fetchTransactionsError ? (
    <p className={css.error}>
      <FormattedMessage id="InboxPage.fetchFailed" />
    </p>
  ) : null;

  const hasTransactions =
    (ensuredCurrentUser.id &&
      transactions &&
      transactions.length > 0 &&
      transactions[0].customer.id.uuid === ensuredCurrentUser.id.uuid) ||
    (ensuredCurrentUser.id &&
      transactions &&
      transactions.length > 0 &&
      transactions[0].provider.id.uuid === ensuredCurrentUser.id.uuid);
  const pagingLinks =
    hasTransactions && pagination && pagination.totalPages > 1 ? (
      <PaginationLinks
        className={css.pagination}
        pageName="InboxPage"
        pagePathParams={params}
        pagination={pagination}
      />
    ) : null;

  //Need to change to only new notifications
  const notificationBadge =
    notificationCount > 0 ? <NotificationBadge count={notificationCount} /> : null;

  const tabs = [
    {
      text: (
        <span>
          <FormattedMessage id="InboxPage.messagesTabTitle" />
        </span>
      ),
      selected: isMessages,
      linkProps: {
        name: 'InboxPage',
        params: {
          tab: 'messages',
          search: '?id=',
        },
      },
    },
    {
      text: (
        <span>
          <FormattedMessage id="InboxPage.notificationsTabTitle" />
          {notificationBadge}
        </span>
      ),
      selected: !isMessages,
      linkProps: {
        name: 'InboxPage',
        params: {
          tab: 'notifications',
          search: '?id=',
        },
      },
    },
  ];

  const nav = (
    <LinkTabNavHorizontal
      rootClassName={css.tabs}
      tabRootClassName={css.tab}
      tabContentClass={css.tabContent}
      tabs={tabs}
    />
  );

  const initialMessageFailed = !!(
    initialMessageFailedToTransaction &&
    currentTransaction.id &&
    initialMessageFailedToTransaction.uuid === currentTransaction.id.uuid
  );

  const currentMessages = messages.get(currentTxId) || [];

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation className={css.sideNavigation}>
        <LayoutWrapperTopbar>
          <TopbarContainer
            className={css.topbar}
            mobileRootClassName={css.mobileTopbar}
            desktopClassName={css.desktopTopbar}
            currentPage="InboxPage"
          />
        </LayoutWrapperTopbar>
        <LayoutWrapperSideNav className={css.navigation}>
          <h1 className={css.title}>
            <FormattedMessage id="InboxPage.title" />
          </h1>
          {currentUserListing ? nav : <div className={css.navPlaceholder} />}
          {error}
          {isMessages ? (
            <MessagesInboxSideList
              fetchTransactionsInProgress={fetchTransactionsInProgress}
              transactions={transactions}
              currentTransaction={currentTransaction}
              messages={messages}
              intl={intl}
              params={params}
              ensuredCurrentUser={ensuredCurrentUser}
              currentTxId={currentTxId}
              fetchTransactionsError={fetchTransactionsError}
              history={history}
              onSetCurrentTransaction={onSetCurrentTransaction}
              onFetchOtherUserListing={onFetchOtherUserListing}
              onUpdateViewedMessages={onUpdateViewedMessages}
              updateViewedMessagesInProgress={updateViewedMessagesInProgress}
              currentMessages={currentMessages}
            />
          ) : (
            <NotificationsInboxSideList
              fetchTransactionsInProgress={fetchTransactionsInProgress}
              transactions={transactions}
              intl={intl}
              params={params}
              currentUser={currentUser}
              history={history}
              currentTransaction={currentTransaction}
              onUpdateViewedNotifications={onUpdateViewedNotifications}
              updateViewedNotificationsSuccess={updateViewedNotificationsSuccess}
              updateViewedNotificationsInProgress={updateViewedNotificationsInProgress}
              updateViewedNotificationsError={updateViewedNotificationsError}
            />
          )}
          {pagingLinks}
        </LayoutWrapperSideNav>
        <LayoutWrapperMain className={css.wrapper}>
          {currentTxId && isMessages && (
            <MessagePanel
              transaction={currentTransaction}
              currentUser={ensuredCurrentUser}
              fetchMessagesError={fetchMessagesError}
              fetchMessagesInProgress={fetchMessagesInProgress}
              initialMessageFailed={initialMessageFailed}
              messages={currentMessages}
              oldestMessagePageFetched={oldestMessagePageFetched}
              onShowMoreMessages={onShowMoreMessages}
              totalMessagePages={totalMessagePages}
              sendMessageInProgress={sendMessageInProgress}
              sendMessageError={sendMessageError}
              transactionRole={transactionRole}
              onSendMessage={onSendMessage}
              otherUserListing={otherUserListing}
              onManageDisableScrolling={onManageDisableScrolling}
              onFetchTransaction={onFetchTransaction}
              onOpenPaymentModal={onOpenPaymentModal}
              onRequestPayment={onTransitionToRequestPayment}
              transitionToRequestPaymentInProgress={transitionToRequestPaymentInProgress}
              transitionToRequestPaymentError={transitionToRequestPaymentError}
              transitionToRequestPaymentSuccess={transitionToRequestPaymentSuccess}
            />
          )}
          {isPaymentModalOpen && (
            <StripePaymentModal
              containerClassName={css.paymentModal}
              isOpen={isPaymentModalOpen}
              onClose={onClosePaymentModal}
            />
          )}
        </LayoutWrapperMain>
        <LayoutWrapperFooter>
          <Footer />
        </LayoutWrapperFooter>
      </LayoutSideNavigation>
    </Page>
  );
};

InboxPageComponent.defaultProps = {
  unitType: config.bookingUnitType,
  currentUser: null,
  currentUserListing: null,
  currentUserHasOrders: null,
  fetchTransactionsError: null,
  pagination: null,
  notifications: [],
  sendVerificationEmailError: null,
  updateViewedMessagesSuccess: false,
  updateViewedMessagesInProgress: false,
  updateViewedMessagesError: null,
};

InboxPageComponent.propTypes = {
  params: shape({
    tab: string.isRequired,
    id: string,
  }).isRequired,
  unitType: propTypes.bookingUnitType,
  currentUser: propTypes.currentUser,
  currentUserListing: propTypes.ownListing,
  fetchTransactionsInProgress: bool.isRequired,
  fetchTransactionsError: propTypes.error,
  pagination: propTypes.pagination,
  notifications: array,
  scrollingDisabled: bool.isRequired,
  currentTransactions: arrayOf(propTypes.transaction).isRequired,

  /* from withRouter */
  history: shape({
    push: func.isRequired,
  }).isRequired,

  // from injectIntl
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const {
    fetchTransactionsInProgress,
    fetchTransactionsError,
    pagination,
    fetchMessagesInProgress,
    totalMessagePages,
    messages,
    oldestMessagePageFetched,
    initialMessageFailedToTransaction,
    fetchMessagesError,
    sendMessageInProgress,
    sendMessageError,
    transactionRefs,
    otherUserListing,
    updateViewedMessagesSuccess,
    updateViewedMessagesInProgress,
    updateViewedMessagesError,
    updateViewedNotificationsSuccess,
    updateViewedNotificationsInProgress,
    updateViewedNotificationsError,
    transitionToRequestPaymentInProgress,
    transitionToRequestPaymentError,
    transitionToRequestPaymentSuccess,
  } = state.InboxPage;
  const {
    currentUser,
    currentUserListing,
    currentUserNotifications: notifications,
    fetchCurrentUserNotificationsInProgress,
    fetchCurrentUserNotificationsError,
  } = state.user;
  return {
    currentUser,
    currentUserListing,
    fetchTransactionsInProgress,
    fetchTransactionsError,
    pagination,
    notifications,
    scrollingDisabled: isScrollingDisabled(state),
    currentTransactions: getMarketplaceEntities(state, transactionRefs),
    fetchMessagesInProgress,
    totalMessagePages,
    messages,
    oldestMessagePageFetched,
    initialMessageFailedToTransaction,
    fetchMessagesError,
    sendMessageInProgress,
    sendMessageError,
    otherUserListing,
    fetchCurrentUserNotificationsInProgress,
    fetchCurrentUserNotificationsError,
    updateViewedMessagesSuccess,
    updateViewedMessagesInProgress,
    updateViewedMessagesError,
    updateViewedNotificationsSuccess,
    updateViewedNotificationsInProgress,
    updateViewedNotificationsError,
    transitionToRequestPaymentInProgress,
    transitionToRequestPaymentError,
    transitionToRequestPaymentSuccess,
  };
};

const mapDispatchToProps = dispatch => ({
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  onChangeMissingInfoModal: value => dispatch(changeModalValue(value)),
  onShowMoreMessages: txId => dispatch(fetchMoreMessages(txId)),
  onSendMessage: (txId, message) => dispatch(sendMessage(txId, message)),
  onClearMessages: () => dispatch(clearMessages()),
  onFetchOtherUserListing: userId => dispatch(fetchOtherUserListing(userId)),
  onFetchTransaction: txId => dispatch(fetchTransaction(txId)),
  onSetCurrentTransaction: tx => dispatch(setCurrentTransaction(tx)),
  onUpdateViewedMessages: (tx, messages) => dispatch(updateViewedMessages(tx, messages)),
  onUpdateViewedNotifications: (userId, viewedNotifications) =>
    dispatch(updateViewedNotifications(userId, viewedNotifications)),
  onTransitionToRequestPayment: tx => dispatch(transitionToRequestPayment(tx)),
});

const InboxPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(InboxPageComponent);

export default InboxPage;
