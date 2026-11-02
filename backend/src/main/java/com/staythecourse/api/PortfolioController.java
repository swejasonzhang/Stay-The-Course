package com.staythecourse.api;

import com.staythecourse.engine.AssetClass;
import com.staythecourse.engine.Holding;
import com.staythecourse.engine.PortfolioAnalyzer;
import jakarta.validation.Valid;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// POST /portfolio: portfolio checkup and rebalancing plan.
@RestController
public class PortfolioController {

    @PostMapping("/portfolio")
    public PortfolioResponse checkup(@Valid @RequestBody PortfolioRequest request) {
        List<Holding> holdings = request.holdings().stream()
                .map(h -> new Holding(h.name(), h.assetClass(), h.value(), h.expenseRatio()))
                .toList();
        Map<AssetClass, Double> target = new EnumMap<>(AssetClass.class);
        target.put(AssetClass.US_STOCKS, request.target().usStocks());
        target.put(AssetClass.INTERNATIONAL_STOCKS, request.target().internationalStocks());
        target.put(AssetClass.BONDS, request.target().bonds());
        target.put(AssetClass.CASH, request.target().cash());
        return PortfolioResponse.from(
                PortfolioAnalyzer.analyze(holdings, target, request.newContribution(), request.driftThreshold()));
    }
}
