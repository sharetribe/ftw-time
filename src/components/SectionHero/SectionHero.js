import { string } from 'prop-types';
import { FormattedMessage } from '../../util/reactIntl';
import classNames from 'classnames';
import { NamedLink } from '../../components';
import { LocationSearchForm } from '../../forms';
import css from './SectionHero.module.css';
import React, { Component } from 'react';

const SectionHero = props => {
  const { rootClassName, className } = props;

  const classes = classNames(rootClassName || css.root, className);

  const handleSearchSubmit = values => {
    const { search, selectedPlace } = values.location;
    const { origin, bounds } = selectedPlace;
    const searchParams = { address: search, origin, bounds };
    history.push(
      createResourceLocatorString('SearchPage', routeConfiguration(), {}, searchParams)
    );
  };

  return (
    <div className={classes}>
      <div className={css.heroContent}>
        <h1 className={css.heroMainTitle}>
          <FormattedMessage id="SectionHero.title" />
          <FormattedMessage id="SectionHero.title2" />
          <FormattedMessage id="SectionHero.title3" />
          </h1>
        <h3 className={css.heroSubTitle}>
          <FormattedMessage id="SectionHero.subTitle" />
        </h3>
 <LocationSearchForm className={css.searchFormHero} onSubmit={handleSearchSubmit} />
 <NamedLink
   name="SearchPage"
   to={{
     search:
       'address=United%20States%20of%20America&bounds=71.540724%2C-66.885444%2C18.765563%2C-179.9',
   }}

   className={css.heroButton}
 >
   <FormattedMessage id="SectionHero.browseButton" />
 </NamedLink>
      </div>
    </div>
  );
};

SectionHero.defaultProps = { rootClassName: null, className: null };

SectionHero.propTypes = {
  rootClassName: string,
  className: string,
};

const mapStateToProps = state => {
  return {
    scrollingDisabled: isScrollingDisabled(state),
  };
};

export default SectionHero;
